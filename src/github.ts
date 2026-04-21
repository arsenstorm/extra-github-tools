const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_USER_AGENT = "extra-github-tools";
const DEFAULT_CONTRIBUTOR_STATS_ATTEMPTS = 5;
const DEFAULT_CONTRIBUTOR_STATS_DELAY_MS = 1000;

interface GitHubViewerResponse {
	avatar_url: string;
	html_url: string;
	id: number;
	login: string;
	name: string | null;
}

interface GitHubOrganizationResponse {
	avatar_url: string;
	id: number;
	login: string;
}

interface GitHubRepositoryResponse {
	full_name: string;
	html_url: string;
	id: number;
	name: string;
}

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
	weeks: GitHubContributorWeek[];
}

interface GitHubUserProfileResponse {
	email: string | null;
	login: string;
	name: string | null;
}

export interface GitHubViewer {
	avatarUrl: string;
	htmlUrl: string;
	login: string;
	name: string | null;
}

export interface GitHubAccount {
	avatar: string;
	handle: string;
	id: number;
}

export interface GitHubRepository {
	fullName: string;
	htmlUrl: string;
	id: number;
	name: string;
}

export interface TransferRepositoryResult {
	ok: boolean;
	repository: string;
	status: number;
	statusText: string;
}

export interface ContributorStats {
	additions: number;
	commits: number;
	deletions: number;
	email: string;
	files: number;
	name: string;
	percentage: number;
}

export interface RepoStats {
	contributors: ContributorStats[];
	totalAdditions: number;
	totalCommits: number;
	totalDeletions: number;
	totalFiles: number;
	totalLines: number;
}

export interface AnalyzeGitHubRepositoryOptions {
	contributorStatsDelayMs?: number;
	fetchImplementation?: typeof fetch;
	maxContributorStatsAttempts?: number;
	sleep?: (durationMs: number) => Promise<void>;
}

const sleep = async (durationMs: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, durationMs);
	});

const createGitHubHeaders = (
	accessToken: string,
	initialHeaders?: HeadersInit
): Headers => {
	const headers = new Headers(initialHeaders);

	headers.set("Accept", "application/vnd.github+json");
	headers.set("Authorization", `Bearer ${accessToken}`);
	headers.set("User-Agent", GITHUB_USER_AGENT);
	headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);

	return headers;
};

const createGitHubError = async (
	response: Response,
	fallbackMessage: string
): Promise<Error> => {
	const errorText = (await response.text()).trim();

	if (!errorText) {
		return new Error(fallbackMessage);
	}

	return new Error(`${fallbackMessage} ${errorText}`);
};

const fetchGitHubResponse = async (
	pathname: string,
	accessToken: string,
	fetchImplementation: typeof fetch = fetch,
	initialRequest?: RequestInit
): Promise<Response> =>
	fetchImplementation(`${GITHUB_API_URL}${pathname}`, {
		...initialRequest,
		cache: "no-store",
		headers: createGitHubHeaders(accessToken, initialRequest?.headers),
	});

const fetchGitHubJson = async <ResponseData>(
	pathname: string,
	accessToken: string,
	fetchImplementation: typeof fetch = fetch,
	initialRequest?: RequestInit,
	fallbackMessage = "GitHub request failed."
): Promise<ResponseData> => {
	const response = await fetchGitHubResponse(
		pathname,
		accessToken,
		fetchImplementation,
		initialRequest
	);

	if (!response.ok) {
		throw await createGitHubError(response, fallbackMessage);
	}

	return (await response.json()) as ResponseData;
};

export async function getGitHubViewer(
	accessToken: string,
	fetchImplementation: typeof fetch = fetch
): Promise<GitHubViewer> {
	const viewer = await fetchGitHubJson<GitHubViewerResponse>(
		"/user",
		accessToken,
		fetchImplementation,
		undefined,
		"Failed to load the current GitHub user."
	);

	return {
		avatarUrl: viewer.avatar_url,
		htmlUrl: viewer.html_url,
		login: viewer.login,
		name: viewer.name,
	};
}

export async function listGitHubAccounts(
	accessToken: string,
	fetchImplementation: typeof fetch = fetch
): Promise<GitHubAccount[]> {
	const [user, organizations] = await Promise.all([
		fetchGitHubJson<GitHubViewerResponse>(
			"/user",
			accessToken,
			fetchImplementation,
			undefined,
			"Failed to load the current GitHub account."
		),
		fetchGitHubJson<GitHubOrganizationResponse[]>(
			"/user/orgs",
			accessToken,
			fetchImplementation,
			undefined,
			"Failed to load your GitHub organizations."
		),
	]);

	return [
		{
			avatar: user.avatar_url,
			handle: user.login,
			id: user.id,
		},
		...organizations.map((organization) => ({
			avatar: organization.avatar_url,
			handle: organization.login,
			id: organization.id,
		})),
	];
}

const mapGitHubRepositories = (
	repositories: GitHubRepositoryResponse[]
): GitHubRepository[] =>
	repositories.map((repository) => ({
		fullName: repository.full_name,
		htmlUrl: repository.html_url,
		id: repository.id,
		name: repository.name,
	}));

export async function listGitHubRepositories(
	accessToken: string,
	account: string,
	fetchImplementation: typeof fetch = fetch
): Promise<GitHubRepository[]> {
	const [organizationResponse, userResponse] = await Promise.all([
		fetchGitHubResponse(
			`/orgs/${account}/repos`,
			accessToken,
			fetchImplementation
		),
		fetchGitHubResponse(
			`/users/${account}/repos`,
			accessToken,
			fetchImplementation
		),
	]);

	const organizationRepositories = organizationResponse.ok
		? ((await organizationResponse.json()) as GitHubRepositoryResponse[])
		: null;

	if (organizationRepositories && organizationRepositories.length > 0) {
		return mapGitHubRepositories(organizationRepositories);
	}

	if (userResponse.ok) {
		const userRepositories =
			(await userResponse.json()) as GitHubRepositoryResponse[];

		return mapGitHubRepositories(userRepositories);
	}

	throw await createGitHubError(
		organizationResponse.ok ? userResponse : organizationResponse,
		`Failed to load repositories for ${account}.`
	);
}

export async function transferGitHubRepositories(
	accessToken: string,
	from: string,
	to: string,
	repositories: string[],
	fetchImplementation: typeof fetch = fetch
): Promise<TransferRepositoryResult[]> {
	return await Promise.all(
		repositories.map(async (repository) => {
			const response = await fetchGitHubResponse(
				`/repos/${from}/${repository}/transfer`,
				accessToken,
				fetchImplementation,
				{
					body: JSON.stringify({
						new_owner: to,
					}),
					headers: {
						"Content-Type": "application/json",
					},
					method: "POST",
				}
			);

			if (!response.ok) {
				throw await createGitHubError(
					response,
					`Failed to transfer ${repository}.`
				);
			}

			return {
				ok: response.ok,
				repository,
				status: response.status,
				statusText: response.statusText,
			};
		})
	);
}

const getContributorStatsWithRetry = async (
	accessToken: string,
	owner: string,
	repositoryName: string,
	options: Required<
		Pick<
			AnalyzeGitHubRepositoryOptions,
			| "contributorStatsDelayMs"
			| "fetchImplementation"
			| "maxContributorStatsAttempts"
			| "sleep"
		>
	>
): Promise<GitHubContributorStatsResponse[]> => {
	for (
		let attempt = 1;
		attempt <= options.maxContributorStatsAttempts;
		attempt += 1
	) {
		const response = await fetchGitHubResponse(
			`/repos/${owner}/${repositoryName}/stats/contributors`,
			accessToken,
			options.fetchImplementation
		);

		if (response.status === 202) {
			if (attempt === options.maxContributorStatsAttempts) {
				throw new Error(
					"GitHub is still calculating contributor statistics. Please try again in a moment."
				);
			}

			await options.sleep(options.contributorStatsDelayMs);
			continue;
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

		if (Array.isArray(contributors)) {
			return contributors;
		}

		if (attempt === options.maxContributorStatsAttempts) {
			throw new Error(
				"GitHub returned empty contributor statistics. Please try again in a moment."
			);
		}

		await options.sleep(options.contributorStatsDelayMs);
	}

	throw new Error(
		"GitHub is still calculating contributor statistics. Please try again in a moment."
	);
};

export async function analyzeGitHubRepository(
	accessToken: string,
	owner: string,
	repositoryName: string,
	options: AnalyzeGitHubRepositoryOptions = {}
): Promise<RepoStats> {
	const resolvedOptions = {
		contributorStatsDelayMs:
			options.contributorStatsDelayMs ?? DEFAULT_CONTRIBUTOR_STATS_DELAY_MS,
		fetchImplementation: options.fetchImplementation ?? fetch,
		maxContributorStatsAttempts:
			options.maxContributorStatsAttempts ?? DEFAULT_CONTRIBUTOR_STATS_ATTEMPTS,
		sleep: options.sleep ?? sleep,
	};

	const repository = await fetchGitHubJson<GitHubRepositoryInfoResponse>(
		`/repos/${owner}/${repositoryName}`,
		accessToken,
		resolvedOptions.fetchImplementation,
		undefined,
		`Failed to load ${owner}/${repositoryName}.`
	);

	const [contributors, tree] = await Promise.all([
		getContributorStatsWithRetry(
			accessToken,
			owner,
			repositoryName,
			resolvedOptions
		),
		fetchGitHubJson<GitHubTreeResponse>(
			`/repos/${owner}/${repositoryName}/git/trees/${repository.default_branch}?recursive=1`,
			accessToken,
			resolvedOptions.fetchImplementation,
			undefined,
			`Failed to load the file tree for ${owner}/${repositoryName}.`
		),
	]);

	const totalCommits = contributors.reduce(
		(total, contributor) => total + (contributor.total || 0),
		0
	);

	const contributorRows = await Promise.all(
		contributors
			.filter(
				(
					contributor
				): contributor is GitHubContributorStatsResponse & {
					author: { login: string };
				} => Boolean(contributor.author?.login)
			)
			.map(async (contributor) => {
				const profile = await fetchGitHubJson<GitHubUserProfileResponse>(
					`/users/${contributor.author.login}`,
					accessToken,
					resolvedOptions.fetchImplementation,
					undefined,
					`Failed to load the GitHub profile for ${contributor.author.login}.`
				);

				let additions = 0;
				let deletions = 0;
				let files = 0;

				for (const week of contributor.weeks ?? []) {
					additions += week.a || 0;
					deletions += week.d || 0;

					if (week.c > 0) {
						files += 1;
					}
				}

				return {
					additions,
					commits: contributor.total || 0,
					deletions,
					email:
						profile.email ??
						`${contributor.author.login}@users.noreply.github.com`,
					files,
					name: profile.name ?? contributor.author.login,
					percentage:
						totalCommits > 0
							? ((contributor.total || 0) / totalCommits) * 100
							: 0,
				} satisfies ContributorStats;
			})
	);

	const totalAdditions = contributorRows.reduce(
		(total, contributor) => total + contributor.additions,
		0
	);
	const totalDeletions = contributorRows.reduce(
		(total, contributor) => total + contributor.deletions,
		0
	);
	const totalLines = Math.max(0, totalAdditions - totalDeletions);
	const totalFiles = tree.tree.filter((item) => item.type === "blob").length;

	contributorRows.sort(
		(leftContributor, rightContributor) =>
			rightContributor.commits - leftContributor.commits
	);

	return {
		contributors: contributorRows,
		totalAdditions,
		totalCommits,
		totalDeletions,
		totalFiles,
		totalLines,
	};
}
