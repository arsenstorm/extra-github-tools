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

const loadContributorRow = async (
	context: GitHubRequestContext,
	contributor: ContributorWithAuthor,
	totalCommits: number
): Promise<ContributorStats> => {
	const { login } = contributor.author;
	const profile = await fetchGitHubJson<GitHubUserProfileResponse>(
		context,
		`/users/${login}`,
		`Failed to load the GitHub profile for ${login}.`
	);
	const commits = contributor.total || 0;

	return {
		...summarizeWeeks(contributor.weeks ?? []),
		commits,
		email: profile.email ?? `${login}@users.noreply.github.com`,
		name: profile.name ?? login,
		percentage: totalCommits > 0 ? (commits / totalCommits) * 100 : 0,
	};
};

const hasAuthor = (
	contributor: GitHubContributorStatsResponse
): contributor is ContributorWithAuthor => Boolean(contributor.author?.login);

const sumBy = <Item>(items: Item[], getValue: (item: Item) => number): number =>
	items.reduce((total, item) => total + getValue(item), 0);

const countFiles = async (
	context: GitHubRequestContext,
	owner: string,
	repositoryName: string
): Promise<number> => {
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

	return tree.tree.filter((item) => item.type === "blob").length;
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
	const totalCommits = sumBy(
		contributors,
		(contributor) => contributor.total || 0
	);
	const [contributorRows, totalFiles] = await Promise.all([
		mapWithConcurrency(
			contributors.filter(hasAuthor),
			MAX_CONTRIBUTOR_PROFILE_CONCURRENCY,
			(contributor) => loadContributorRow(context, contributor, totalCommits)
		),
		countFiles(context, owner, repositoryName),
	]);
	const totalAdditions = sumBy(contributorRows, (row) => row.additions);
	const totalDeletions = sumBy(contributorRows, (row) => row.deletions);

	contributorRows.sort((left, right) => right.commits - left.commits);

	return {
		contributors: contributorRows,
		totalAdditions,
		totalCommits,
		totalDeletions,
		totalFiles,
		totalLines: Math.max(0, totalAdditions - totalDeletions),
	};
}
