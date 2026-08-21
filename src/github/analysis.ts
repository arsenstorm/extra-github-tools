import {
	createGitHubError,
	createRequestContext,
	fetchGitHubJson,
	fetchGitHubResponse,
	type GitHubRequestContext,
	getRetryAfterDelayMs,
	mapWithConcurrency,
	repositoryPathname,
	type Sleep,
	sleep,
} from "./client";
import { isBotLogin } from "./contributor-summary";
import {
	type AnalyzeGitHubRepositoryOptions,
	type ContributorStats,
	GitHubContributorStatsPendingError,
	type RepoStats,
} from "./types";

const DEFAULT_CONTRIBUTOR_STATS_ATTEMPTS = 8;
const DEFAULT_CONTRIBUTOR_STATS_DELAY_MS = 2000;
const MAX_CONTRIBUTOR_PROFILE_CONCURRENCY = 5;

interface GitHubRepositoryInfoResponse {
	default_branch: string;
}

interface GitHubTreeResponse {
	tree: Array<{
		type?: string;
	}>;
	truncated?: boolean;
}

interface GitHubContributorWeek {
	a: number;
	c: number;
	d: number;
}

interface GitHubContributorStatsResponse {
	author: {
		login: string;
	} | null;
	total: number;
	weeks?: GitHubContributorWeek[];
}

type ContributorWithAuthor = GitHubContributorStatsResponse & {
	author: { login: string };
};

interface GitHubUserProfileResponse {
	email: string | null;
	login: string;
	name: string | null;
}

interface ContributorStatsRetry {
	delayMs: number;
	maxAttempts: number;
	sleep: Sleep;
}

type ContributorStatsAttempt =
	| { contributors: GitHubContributorStatsResponse[]; status: "ready" }
	| { retryDelayMs: number; status: "pending" }
	| { status: "empty" };

/** GitHub answers 202 while it computes stats, and occasionally an empty body once it has. */
const attemptContributorStats = async (
	context: GitHubRequestContext,
	pathname: string,
	defaultDelayMs: number
): Promise<ContributorStatsAttempt> => {
	const response = await fetchGitHubResponse(context, pathname);

	if (response.status === 202) {
		return {
			retryDelayMs: getRetryAfterDelayMs(response, defaultDelayMs),
			status: "pending",
		};
	}

	if (response.status === 204) {
		return { contributors: [], status: "ready" };
	}

	if (!response.ok) {
		throw await createGitHubError(
			response,
			"Failed to load repository contributor statistics."
		);
	}

	const contributors = (await response.json()) as
		| GitHubContributorStatsResponse[]
		| null;

	return Array.isArray(contributors)
		? { contributors, status: "ready" }
		: { status: "empty" };
};

const getContributorStatsWithRetry = async (
	context: GitHubRequestContext,
	owner: string,
	repositoryName: string,
	retry: ContributorStatsRetry
): Promise<GitHubContributorStatsResponse[]> => {
	const pathname = `${repositoryPathname(owner, repositoryName)}/stats/contributors`;

	for (let attempt = 1; attempt <= retry.maxAttempts; attempt += 1) {
		// biome-ignore lint/performance/noAwaitInLoops: retries are sequential by design
		const result = await attemptContributorStats(
			context,
			pathname,
			retry.delayMs
		);

		if (result.status === "ready") {
			return result.contributors;
		}

		if (attempt === retry.maxAttempts) {
			break;
		}

		await retry.sleep(
			result.status === "pending" ? result.retryDelayMs : retry.delayMs
		);
	}

	throw new GitHubContributorStatsPendingError(owner, repositoryName);
};

const summarizeWeeks = (
	weeks: GitHubContributorWeek[]
): Pick<ContributorStats, "activeWeeks" | "additions" | "deletions"> => {
	let activeWeeks = 0;
	let additions = 0;
	let deletions = 0;

	for (const week of weeks) {
		additions += week.a || 0;
		deletions += week.d || 0;

		if (week.c > 0) {
			activeWeeks += 1;
		}
	}

	return { activeWeeks, additions, deletions };
};

const loadContributorProfile = async (
	context: GitHubRequestContext,
	login: string
): Promise<Pick<ContributorStats, "email" | "name">> => {
	const fallback = {
		email: `${login}@users.noreply.github.com`,
		name: login,
	};

	try {
		const profile = await fetchGitHubJson<GitHubUserProfileResponse>(
			context,
			`/users/${login}`,
			`Failed to load the GitHub profile for ${login}.`
		);

		return {
			email: profile.email ?? fallback.email,
			name: profile.name ?? fallback.name,
		};
	} catch {
		// A missing or rate-limited profile must not sink the whole analysis.
		return fallback;
	}
};

const loadContributorRow = async (
	context: GitHubRequestContext,
	contributor: ContributorWithAuthor
): Promise<ContributorStats> => {
	const { login } = contributor.author;

	return {
		...summarizeWeeks(contributor.weeks ?? []),
		...(await loadContributorProfile(context, login)),
		commits: contributor.total || 0,
		isBot: isBotLogin(login),
		login,
	};
};

const hasAuthor = (
	contributor: GitHubContributorStatsResponse
): contributor is ContributorWithAuthor => Boolean(contributor.author?.login);

const sumBy = <Item>(items: Item[], getValue: (item: Item) => number): number =>
	items.reduce((total, item) => total + getValue(item), 0);

interface RepositoryTreeSummary {
	defaultBranch: string;
	totalFiles: number;
	totalFilesTruncated: boolean;
}

const loadRepositoryTree = async (
	context: GitHubRequestContext,
	owner: string,
	repositoryName: string
): Promise<RepositoryTreeSummary> => {
	const pathname = repositoryPathname(owner, repositoryName);
	const repository = await fetchGitHubJson<GitHubRepositoryInfoResponse>(
		context,
		pathname,
		`Failed to load ${owner}/${repositoryName}.`
	);
	const tree = await fetchGitHubJson<GitHubTreeResponse>(
		context,
		`${pathname}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`,
		`Failed to load the file tree for ${owner}/${repositoryName}.`
	);

	return {
		defaultBranch: repository.default_branch,
		totalFiles: tree.tree.filter((item) => item.type === "blob").length,
		totalFilesTruncated: tree.truncated === true,
	};
};

export async function analyzeGitHubRepository(
	accessToken: string,
	owner: string,
	repositoryName: string,
	options: AnalyzeGitHubRepositoryOptions = {}
): Promise<RepoStats> {
	const context = createRequestContext(
		accessToken,
		options.fetchImplementation
	);
	const contributors = await getContributorStatsWithRetry(
		context,
		owner,
		repositoryName,
		{
			delayMs:
				options.contributorStatsDelayMs ?? DEFAULT_CONTRIBUTOR_STATS_DELAY_MS,
			maxAttempts:
				options.maxContributorStatsAttempts ??
				DEFAULT_CONTRIBUTOR_STATS_ATTEMPTS,
			sleep: options.sleep ?? sleep,
		}
	);
	const unattributedCommits = sumBy(
		contributors.filter((contributor) => !hasAuthor(contributor)),
		(contributor) => contributor.total || 0
	);
	const [contributorRows, tree] = await Promise.all([
		mapWithConcurrency(
			contributors.filter(hasAuthor),
			MAX_CONTRIBUTOR_PROFILE_CONCURRENCY,
			(contributor) => loadContributorRow(context, contributor)
		),
		loadRepositoryTree(context, owner, repositoryName),
	]);

	contributorRows.sort((left, right) => right.commits - left.commits);

	return {
		contributors: contributorRows,
		defaultBranch: tree.defaultBranch,
		totalFiles: tree.totalFiles,
		totalFilesTruncated: tree.totalFilesTruncated,
		unattributedCommits,
	};
}
