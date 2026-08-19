const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_USER_AGENT = "extra-github-tools";
const DEFAULT_CONTRIBUTOR_STATS_ATTEMPTS = 8;
const DEFAULT_CONTRIBUTOR_STATS_DELAY_MS = 2000;
const MAX_CONTRIBUTOR_STATS_RETRY_DELAY_MS = 5000;
const DEFAULT_TRANSFER_SETTINGS_ATTEMPTS = 10;
const DEFAULT_TRANSFER_SETTINGS_DELAY_MS = 2000;
const GITHUB_LIST_PAGE_SIZE = 100;
const MAX_PAGINATION_CONCURRENCY = 5;
const MAX_TRANSFER_CONCURRENCY = 3;
const MAX_CONTRIBUTOR_PROFILE_CONCURRENCY = 5;
const CONTRIBUTOR_STATS_PENDING_MESSAGE =
	"GitHub is still calculating contributor statistics. Please try again in a moment.";
const REPOSITORY_OPERATION_IN_PROGRESS_MESSAGE =
	"previous repository operation is still in progress";
const DEFAULT_MANAGE_RATE_LIMIT_ATTEMPTS = 5;
const DEFAULT_MANAGE_RATE_LIMIT_DELAY_MS = 2000;
const MAX_MANAGE_CONCURRENCY = 3;
const NO_CHANGE_NEEDED_STATUS_TEXT = "No change needed";

export const TRANSFER_REPOSITORY_ARCHIVE_STATES = [
	"current",
	"archived",
	"unarchived",
] as const;
export const TRANSFER_REPOSITORY_VISIBILITIES = [
	"current",
	"private",
	"public",
] as const;

export const MANAGE_REPOSITORY_ARCHIVE_ACTIONS = [
	"current",
	"archived",
	"unarchived",
] as const;
export const MANAGE_REPOSITORY_VISIBILITY_ACTIONS = [
	"current",
	"public",
	"private",
	"internal",
] as const;
export const MANAGE_REPOSITORY_SUBSCRIPTION_ACTIONS = [
	"current",
	"watching",
	"unwatching",
	"ignoring",
] as const;

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
	archived: boolean;
	fork: boolean;
	full_name: string;
	html_url: string;
	id: number;
	name: string;
	private: boolean;
	pushed_at: string | null;
	visibility?: string;
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

export type RepositoryVisibility = "internal" | "private" | "public";

export interface GitHubRepository {
	archived: boolean;
	fork: boolean;
	fullName: string;
	htmlUrl: string;
	id: number;
	name: string;
	private: boolean;
	pushedAt: string | null;
	visibility: RepositoryVisibility;
}

export interface TransferRepositoryResult {
	error: string | null;
	newName: string;
	ok: boolean;
	postTransferSettings?: TransferRepositorySettingsResult;
	repository: string;
	status: number;
	statusText: string;
}

export type TransferRepositoryArchiveState =
	(typeof TRANSFER_REPOSITORY_ARCHIVE_STATES)[number];

export type TransferRepositoryVisibility =
	(typeof TRANSFER_REPOSITORY_VISIBILITIES)[number];

export interface TransferRepositorySettingsResult {
	error: string | null;
	ok: boolean;
	status: number;
	statusText: string;
}

export type ManageRepositoryArchiveAction =
	(typeof MANAGE_REPOSITORY_ARCHIVE_ACTIONS)[number];
export type ManageRepositoryVisibilityAction =
	(typeof MANAGE_REPOSITORY_VISIBILITY_ACTIONS)[number];
export type ManageRepositorySubscriptionAction =
	(typeof MANAGE_REPOSITORY_SUBSCRIPTION_ACTIONS)[number];
export type RepositorySubscriptionState = Exclude<
	ManageRepositorySubscriptionAction,
	"current"
>;

export interface ManageRepositoryActions {
	archiveAction: ManageRepositoryArchiveAction;
	subscriptionAction: ManageRepositorySubscriptionAction;
	visibilityAction: ManageRepositoryVisibilityAction;
}

export type ManageSettingOutcome = "changed" | "failed" | "unchanged";

export interface ManageSettingResult {
	error: string | null;
	outcome: ManageSettingOutcome;
	status: number;
	statusText: string;
}

export interface ManageRepositoryResult {
	archive: ManageSettingResult | null;
	ok: boolean;
	repository: string;
	subscription: ManageSettingResult | null;
	visibility: ManageSettingResult | null;
}

export interface ManageGitHubRepositoriesOptions {
	maxRateLimitAttempts?: number;
	rateLimitDelayMs?: number;
	sleep?: (durationMs: number) => Promise<void>;
}

export interface ContributorStats {
	activeWeeks: number;
	additions: number;
	commits: number;
	deletions: number;
	email: string;
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

export class GitHubContributorStatsPendingError extends Error {
	constructor(owner: string, repositoryName: string) {
		super(
			`${CONTRIBUTOR_STATS_PENDING_MESSAGE} GitHub may need more time for ${owner}/${repositoryName}.`
		);
		this.name = "GitHubContributorStatsPendingError";
	}
}

export const isGitHubContributorStatsPendingError = (
	error: unknown
): error is GitHubContributorStatsPendingError =>
	error instanceof GitHubContributorStatsPendingError;

export interface TransferGitHubRepositoriesOptions {
	archiveState?: TransferRepositoryArchiveState;
	maxSettingsUpdateAttempts?: number;
	namePrefix?: string;
	nameSuffix?: string;
	settingsUpdateDelayMs?: number;
	sleep?: (durationMs: number) => Promise<void>;
	visibility?: TransferRepositoryVisibility;
}

interface GitHubRepositorySettingsRequestBody {
	archived?: boolean;
	private?: boolean;
}

interface ResolvedManageOptions {
	fetchImplementation: typeof fetch;
	maxRateLimitAttempts: number;
	rateLimitDelayMs: number;
	sleep: (durationMs: number) => Promise<void>;
}

interface GitHubSubscriptionResponse {
	ignored: boolean;
	subscribed: boolean;
}

interface GitHubManagedRepositoryResponse {
	archived: boolean;
	visibility: string;
}

const sleep = async (durationMs: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, durationMs);
	});

const mapWithConcurrency = async <Item, Result>(
	items: Item[],
	concurrency: number,
	mapper: (item: Item) => Promise<Result>
): Promise<Result[]> => {
	const results: Result[] = new Array(items.length);
	let nextIndex = 0;

	const runWorker = async (): Promise<void> => {
		while (nextIndex < items.length) {
			const index = nextIndex;

			nextIndex += 1;
			// biome-ignore lint/performance/noAwaitInLoops: each worker processes its slice sequentially; concurrency comes from running several workers
			results[index] = await mapper(items[index] as Item);
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
	);

	return results;
};

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

const getRetryAfterDelayMs = (
	response: Response,
	defaultDelayMs: number
): number => {
	const retryAfter = response.headers.get("Retry-After");

	if (!retryAfter) {
		return defaultDelayMs;
	}

	const retryAfterSeconds = Number(retryAfter);

	if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
		return Math.min(
			retryAfterSeconds * 1000,
			MAX_CONTRIBUTOR_STATS_RETRY_DELAY_MS
		);
	}

	const retryAfterDate = Date.parse(retryAfter);

	if (!Number.isNaN(retryAfterDate)) {
		return Math.min(
			Math.max(retryAfterDate - Date.now(), 0),
			MAX_CONTRIBUTOR_STATS_RETRY_DELAY_MS
		);
	}

	return defaultDelayMs;
};

const createGitHubPaginatedPathname = (
	pathname: string,
	page: number
): string => {
	const paginationParams = new URLSearchParams({
		page: String(page),
		per_page: String(GITHUB_LIST_PAGE_SIZE),
	});
	const separator = pathname.includes("?") ? "&" : "?";

	return `${pathname}${separator}${paginationParams.toString()}`;
};

const LAST_PAGE_LINK_PATTERN = /[?&]page=(\d+)[^>]*>;\s*rel="last"/;

const getLastPageFromLinkHeader = (response: Response): number | null => {
	const linkHeader = response.headers.get("Link");

	if (!linkHeader) {
		return null;
	}

	const match = linkHeader.match(LAST_PAGE_LINK_PATTERN);

	if (!match) {
		return null;
	}

	const lastPage = Number(match[1]);

	return Number.isInteger(lastPage) && lastPage > 1 ? lastPage : null;
};

const fetchGitHubPaginatedJson = async <ResponseData>(
	pathname: string,
	accessToken: string,
	fetchImplementation: typeof fetch,
	firstResponse: Response,
	fallbackMessage: string
): Promise<ResponseData[]> => {
	if (!firstResponse.ok) {
		throw await createGitHubError(firstResponse, fallbackMessage);
	}

	const firstPageResults = (await firstResponse.json()) as ResponseData[];

	if (firstPageResults.length < GITHUB_LIST_PAGE_SIZE) {
		return firstPageResults;
	}

	const lastPage = getLastPageFromLinkHeader(firstResponse);

	if (lastPage) {
		const remainingPages = Array.from(
			{ length: lastPage - 1 },
			(_item, index) => index + 2
		);
		const remainingPageResults = await mapWithConcurrency(
			remainingPages,
			MAX_PAGINATION_CONCURRENCY,
			async (pageNumber) => {
				const response = await fetchGitHubResponse(
					createGitHubPaginatedPathname(pathname, pageNumber),
					accessToken,
					fetchImplementation
				);

				if (!response.ok) {
					throw await createGitHubError(response, fallbackMessage);
				}

				return (await response.json()) as ResponseData[];
			}
		);

		return [firstPageResults, ...remainingPageResults].flat();
	}

	const results = [...firstPageResults];
	let page = 2;

	for (;;) {
		// biome-ignore lint/performance/noAwaitInLoops: without a Link header the list length is unknown, so pages are fetched in order until a short page ends it
		const response = await fetchGitHubResponse(
			createGitHubPaginatedPathname(pathname, page),
			accessToken,
			fetchImplementation
		);

		if (!response.ok) {
			throw await createGitHubError(response, fallbackMessage);
		}

		const pageResults = (await response.json()) as ResponseData[];

		results.push(...pageResults);

		if (pageResults.length < GITHUB_LIST_PAGE_SIZE) {
			return results;
		}

		page += 1;
	}
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

const toRepositoryVisibility = (
	visibility: string | undefined,
	isPrivate: boolean
): RepositoryVisibility => {
	if (visibility === "internal") {
		return "internal";
	}

	if (visibility === "public" || visibility === "private") {
		return visibility;
	}

	return isPrivate ? "private" : "public";
};

const mapGitHubRepositories = (
	repositories: GitHubRepositoryResponse[]
): GitHubRepository[] =>
	repositories.map((repository) => ({
		archived: repository.archived,
		fork: repository.fork,
		fullName: repository.full_name,
		htmlUrl: repository.html_url,
		id: repository.id,
		name: repository.name,
		private: repository.private,
		pushedAt: repository.pushed_at,
		visibility: toRepositoryVisibility(
			repository.visibility,
			repository.private
		),
	}));

export async function listGitHubRepositories(
	accessToken: string,
	account: string,
	fetchImplementation: typeof fetch = fetch
): Promise<GitHubRepository[]> {
	const organizationRepositoriesPathname = `/orgs/${encodeURIComponent(account)}/repos`;
	const organizationResponse = await fetchGitHubResponse(
		createGitHubPaginatedPathname(organizationRepositoriesPathname, 1),
		accessToken,
		fetchImplementation
	);

	if (organizationResponse.ok) {
		return mapGitHubRepositories(
			await fetchGitHubPaginatedJson<GitHubRepositoryResponse>(
				organizationRepositoriesPathname,
				accessToken,
				fetchImplementation,
				organizationResponse,
				`Failed to load repositories for ${account}.`
			)
		);
	}

	if (organizationResponse.status !== 404) {
		throw await createGitHubError(
			organizationResponse,
			`Failed to load repositories for ${account}.`
		);
	}

	const authenticatedUserRepositoriesPathname = "/user/repos?affiliation=owner";
	const userResponse = await fetchGitHubResponse(
		createGitHubPaginatedPathname(authenticatedUserRepositoriesPathname, 1),
		accessToken,
		fetchImplementation
	);

	if (userResponse.ok) {
		const repositories =
			await fetchGitHubPaginatedJson<GitHubRepositoryResponse>(
				authenticatedUserRepositoriesPathname,
				accessToken,
				fetchImplementation,
				userResponse,
				`Failed to load repositories for ${account}.`
			);

		return mapGitHubRepositories(
			repositories.filter((repository) =>
				repository.full_name
					.toLowerCase()
					.startsWith(`${account.toLowerCase()}/`)
			)
		);
	}

	throw await createGitHubError(
		userResponse,
		`Failed to load repositories for ${account}.`
	);
}

export async function transferGitHubRepositories(
	accessToken: string,
	from: string,
	to: string,
	repositories: string[],
	fetchImplementation: typeof fetch = fetch,
	options: TransferGitHubRepositoriesOptions = {}
): Promise<TransferRepositoryResult[]> {
	const pendingRepositories = [...repositories];
	const results: TransferRepositoryResult[] = [];
	const namePrefix = options.namePrefix ?? "";
	const nameSuffix = options.nameSuffix ?? "";
	const maxSettingsUpdateAttempts =
		options.maxSettingsUpdateAttempts ?? DEFAULT_TRANSFER_SETTINGS_ATTEMPTS;
	const settingsUpdateDelayMs =
		options.settingsUpdateDelayMs ?? DEFAULT_TRANSFER_SETTINGS_DELAY_MS;
	const transferSleep = options.sleep ?? sleep;

	const transferNextRepository = async (): Promise<void> => {
		const repository = pendingRepositories.shift();

		if (!repository) {
			return;
		}

		const newName = `${namePrefix}${repository}${nameSuffix}`;

		try {
			const response = await fetchGitHubResponse(
				`/repos/${encodeURIComponent(from)}/${encodeURIComponent(repository)}/transfer`,
				accessToken,
				fetchImplementation,
				{
					body: JSON.stringify({
						...(newName === repository ? {} : { new_name: newName }),
						new_owner: to,
					}),
					headers: {
						"Content-Type": "application/json",
					},
					method: "POST",
				}
			);

			if (!response.ok) {
				const error = await createGitHubError(
					response,
					`Failed to transfer ${repository}.`
				);

				results.push({
					error: error.message,
					newName,
					ok: false,
					repository,
					status: response.status,
					statusText: response.statusText,
				});

				await transferNextRepository();
				return;
			}

			const postTransferSettings = await updateTransferredRepositorySettings(
				accessToken,
				to,
				newName,
				fetchImplementation,
				{
					archiveState: options.archiveState,
					maxAttempts: maxSettingsUpdateAttempts,
					settingsUpdateDelayMs,
					sleep: transferSleep,
					visibility: options.visibility,
				}
			);

			results.push({
				error: null,
				newName,
				ok: response.ok,
				...(postTransferSettings ? { postTransferSettings } : {}),
				repository,
				status: response.status,
				statusText: response.statusText,
			});
		} catch (error) {
			results.push({
				error: error instanceof Error ? error.message : "Transfer failed.",
				newName,
				ok: false,
				repository,
				status: 0,
				statusText: "Request failed",
			});
		}

		await transferNextRepository();
	};

	const workerCount = Math.min(MAX_TRANSFER_CONCURRENCY, repositories.length);
	const workers = Array.from({ length: workerCount }, () =>
		transferNextRepository()
	);

	await Promise.all(workers);

	return repositories.map(
		(repository) =>
			results.find((result) => result.repository === repository) ?? {
				error: "Transfer did not return a result.",
				newName: `${namePrefix}${repository}${nameSuffix}`,
				ok: false,
				repository,
				status: 0,
				statusText: "Missing result",
			}
	);
}

const createRepositorySettingsRequestBody = ({
	archiveState = "current",
	visibility = "current",
}: {
	archiveState?: TransferRepositoryArchiveState;
	visibility?: TransferRepositoryVisibility;
}): GitHubRepositorySettingsRequestBody => {
	const body: GitHubRepositorySettingsRequestBody = {};

	if (visibility === "private") {
		body.private = true;
	} else if (visibility === "public") {
		body.private = false;
	}

	if (archiveState === "archived") {
		body.archived = true;
	} else if (archiveState === "unarchived") {
		body.archived = false;
	}

	return body;
};

const hasRepositorySettingsRequestBody = (
	body: GitHubRepositorySettingsRequestBody
): boolean => body.private !== undefined || body.archived !== undefined;

const isRetryableRepositorySettingsResponse = (
	response: Response,
	errorMessage: string
): boolean => {
	if (response.status === 404 || response.status === 409) {
		return true;
	}

	return (
		response.status === 422 &&
		errorMessage
			.toLowerCase()
			.includes(REPOSITORY_OPERATION_IN_PROGRESS_MESSAGE)
	);
};

const updateTransferredRepositorySettings = async (
	accessToken: string,
	owner: string,
	repository: string,
	fetchImplementation: typeof fetch,
	options: {
		archiveState?: TransferRepositoryArchiveState;
		maxAttempts: number;
		settingsUpdateDelayMs: number;
		sleep: (durationMs: number) => Promise<void>;
		visibility?: TransferRepositoryVisibility;
	}
): Promise<TransferRepositorySettingsResult | undefined> => {
	const body = createRepositorySettingsRequestBody(options);

	if (!hasRepositorySettingsRequestBody(body)) {
		return;
	}

	let lastResult: TransferRepositorySettingsResult | null = null;

	for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
		try {
			// biome-ignore lint/performance/noAwaitInLoops: retries are sequential by design
			const response = await fetchGitHubResponse(
				`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
				accessToken,
				fetchImplementation,
				{
					body: JSON.stringify(body),
					headers: {
						"Content-Type": "application/json",
					},
					method: "PATCH",
				}
			);

			if (response.ok) {
				return {
					error: null,
					ok: true,
					status: response.status,
					statusText: response.statusText,
				};
			}

			const error = await createGitHubError(
				response,
				`Transferred ${repository}, but failed to update repository settings.`
			);
			const shouldRetry = isRetryableRepositorySettingsResponse(
				response,
				error.message
			);

			lastResult = {
				error: error.message,
				ok: false,
				status: response.status,
				statusText: response.statusText,
			};

			if (!shouldRetry || attempt === options.maxAttempts) {
				return lastResult;
			}
		} catch (error) {
			lastResult = {
				error:
					error instanceof Error
						? error.message
						: "Repository settings update failed.",
				ok: false,
				status: 0,
				statusText: "Request failed",
			};

			if (attempt === options.maxAttempts) {
				return lastResult;
			}
		}

		await options.sleep(options.settingsUpdateDelayMs);
	}

	return (
		lastResult ?? {
			error: "Repository settings update did not return a result.",
			ok: false,
			status: 0,
			statusText: "Missing result",
		}
	);
};

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
		// biome-ignore lint/performance/noAwaitInLoops: retries are sequential by design
		const response = await fetchGitHubResponse(
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/stats/contributors`,
			accessToken,
			options.fetchImplementation
		);

		if (response.status === 202) {
			if (attempt === options.maxContributorStatsAttempts) {
				throw new GitHubContributorStatsPendingError(owner, repositoryName);
			}

			await options.sleep(
				getRetryAfterDelayMs(response, options.contributorStatsDelayMs)
			);
			continue;
		}

		if (response.status === 204) {
			return [];
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

	throw new GitHubContributorStatsPendingError(owner, repositoryName);
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

	const contributors = await getContributorStatsWithRetry(
		accessToken,
		owner,
		repositoryName,
		resolvedOptions
	);

	const totalCommits = contributors.reduce(
		(total, contributor) => total + (contributor.total || 0),
		0
	);

	const contributorsWithAuthor = contributors.filter(
		(
			contributor
		): contributor is GitHubContributorStatsResponse & {
			author: { login: string };
		} => Boolean(contributor.author?.login)
	);
	const contributorRowsPromise = mapWithConcurrency(
		contributorsWithAuthor,
		MAX_CONTRIBUTOR_PROFILE_CONCURRENCY,
		async (contributor) => {
			const profile = await fetchGitHubJson<GitHubUserProfileResponse>(
				`/users/${contributor.author.login}`,
				accessToken,
				resolvedOptions.fetchImplementation,
				undefined,
				`Failed to load the GitHub profile for ${contributor.author.login}.`
			);

			let activeWeeks = 0;
			let additions = 0;
			let deletions = 0;

			for (const week of contributor.weeks ?? []) {
				additions += week.a || 0;
				deletions += week.d || 0;

				if (week.c > 0) {
					activeWeeks += 1;
				}
			}

			return {
				activeWeeks,
				additions,
				commits: contributor.total || 0,
				deletions,
				email:
					profile.email ??
					`${contributor.author.login}@users.noreply.github.com`,
				name: profile.name ?? contributor.author.login,
				percentage:
					totalCommits > 0
						? ((contributor.total || 0) / totalCommits) * 100
						: 0,
			} satisfies ContributorStats;
		}
	);

	const repository = await fetchGitHubJson<GitHubRepositoryInfoResponse>(
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}`,
		accessToken,
		resolvedOptions.fetchImplementation,
		undefined,
		`Failed to load ${owner}/${repositoryName}.`
	);
	const [contributorRows, tree] = await Promise.all([
		contributorRowsPromise,
		fetchGitHubJson<GitHubTreeResponse>(
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`,
			accessToken,
			resolvedOptions.fetchImplementation,
			undefined,
			`Failed to load the file tree for ${owner}/${repositoryName}.`
		),
	]);

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

const isRateLimitedResponse = (response: Response): boolean => {
	if (response.status === 429) {
		return true;
	}

	return (
		response.status === 403 &&
		(response.headers.has("Retry-After") ||
			response.headers.get("X-RateLimit-Remaining") === "0")
	);
};

const fetchWithRateLimitRetry = async (
	sendRequest: () => Promise<Response>,
	options: ResolvedManageOptions
): Promise<Response> => {
	let response = await sendRequest();

	for (
		let attempt = 1;
		attempt < options.maxRateLimitAttempts && isRateLimitedResponse(response);
		attempt += 1
	) {
		// biome-ignore lint/performance/noAwaitInLoops: rate-limit retries are sequential by design
		await options.sleep(
			getRetryAfterDelayMs(response, options.rateLimitDelayMs)
		);
		response = await sendRequest();
	}

	return response;
};

const createUnchangedSettingResult = (): ManageSettingResult => ({
	error: null,
	outcome: "unchanged",
	status: 0,
	statusText: NO_CHANGE_NEEDED_STATUS_TEXT,
});

const getSubscriptionStateFromResponse = (
	subscription: GitHubSubscriptionResponse
): RepositorySubscriptionState => {
	if (subscription.ignored) {
		return "ignoring";
	}

	return subscription.subscribed ? "watching" : "unwatching";
};

const sendSubscriptionUpdate = (
	subscriptionPathname: string,
	accessToken: string,
	targetState: RepositorySubscriptionState,
	fetchImplementation: typeof fetch
): Promise<Response> => {
	if (targetState === "unwatching") {
		return fetchGitHubResponse(
			subscriptionPathname,
			accessToken,
			fetchImplementation,
			{ method: "DELETE" }
		);
	}

	return fetchGitHubResponse(
		subscriptionPathname,
		accessToken,
		fetchImplementation,
		{
			body: JSON.stringify({
				ignored: targetState === "ignoring",
				subscribed: targetState === "watching",
			}),
			headers: {
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
};

const applySubscriptionAction = async (
	accessToken: string,
	owner: string,
	repositoryName: string,
	targetState: RepositorySubscriptionState,
	options: ResolvedManageOptions
): Promise<ManageSettingResult> => {
	const subscriptionPathname = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/subscription`;

	try {
		const currentResponse = await fetchWithRateLimitRetry(
			() =>
				fetchGitHubResponse(
					subscriptionPathname,
					accessToken,
					options.fetchImplementation
				),
			options
		);

		let currentState: RepositorySubscriptionState = "unwatching";

		if (currentResponse.status !== 404) {
			if (!currentResponse.ok) {
				const error = await createGitHubError(
					currentResponse,
					`Failed to load the notification subscription for ${repositoryName}.`
				);

				return {
					error: error.message,
					outcome: "failed",
					status: currentResponse.status,
					statusText: currentResponse.statusText,
				};
			}

			currentState = getSubscriptionStateFromResponse(
				(await currentResponse.json()) as GitHubSubscriptionResponse
			);
		}

		if (currentState === targetState) {
			return createUnchangedSettingResult();
		}

		const updateResponse = await fetchWithRateLimitRetry(
			() =>
				sendSubscriptionUpdate(
					subscriptionPathname,
					accessToken,
					targetState,
					options.fetchImplementation
				),
			options
		);

		if (!updateResponse.ok) {
			const error = await createGitHubError(
				updateResponse,
				`Failed to update notifications for ${repositoryName}.`
			);

			return {
				error: error.message,
				outcome: "failed",
				status: updateResponse.status,
				statusText: updateResponse.statusText,
			};
		}

		return {
			error: null,
			outcome: "changed",
			status: updateResponse.status,
			statusText: updateResponse.statusText,
		};
	} catch (error) {
		return {
			error:
				error instanceof Error ? error.message : "Notification update failed.",
			outcome: "failed",
			status: 0,
			statusText: "Request failed",
		};
	}
};

interface RepositorySettingsBody {
	archived?: boolean;
	visibility?: RepositoryVisibility;
}

interface ResolvedRepositorySettingsBody {
	archive: ManageSettingResult | null;
	body: RepositorySettingsBody;
	visibility: ManageSettingResult | null;
}

const createManageFailureResults = (
	wantsArchiveChange: boolean,
	wantsVisibilityChange: boolean,
	failedResult: ManageSettingResult
): {
	archive: ManageSettingResult | null;
	visibility: ManageSettingResult | null;
} => ({
	archive: wantsArchiveChange ? failedResult : null,
	visibility: wantsVisibilityChange ? { ...failedResult } : null,
});

const resolveRepositorySettingsBody = (
	actions: ManageRepositoryActions,
	current: GitHubManagedRepositoryResponse
): ResolvedRepositorySettingsBody => {
	const { archiveAction, visibilityAction } = actions;
	const body: RepositorySettingsBody = {};
	let archive: ManageSettingResult | null = null;
	let visibility: ManageSettingResult | null = null;

	if (archiveAction !== "current") {
		const targetArchived = archiveAction === "archived";

		if (current.archived === targetArchived) {
			archive = createUnchangedSettingResult();
		} else {
			body.archived = targetArchived;
		}
	}

	if (visibilityAction !== "current") {
		if (current.visibility === visibilityAction) {
			visibility = createUnchangedSettingResult();
		} else {
			body.visibility = visibilityAction;
		}
	}

	return { archive, body, visibility };
};

const patchRepositorySettings = async (
	repositoryPathname: string,
	accessToken: string,
	repositoryName: string,
	body: RepositorySettingsBody,
	options: ResolvedManageOptions
): Promise<ManageSettingResult> => {
	const patchResponse = await fetchWithRateLimitRetry(
		() =>
			fetchGitHubResponse(
				repositoryPathname,
				accessToken,
				options.fetchImplementation,
				{
					body: JSON.stringify(body),
					headers: {
						"Content-Type": "application/json",
					},
					method: "PATCH",
				}
			),
		options
	);

	if (patchResponse.ok) {
		return {
			error: null,
			outcome: "changed",
			status: patchResponse.status,
			statusText: patchResponse.statusText,
		};
	}

	const error = await createGitHubError(
		patchResponse,
		`Failed to update ${repositoryName}.`
	);

	return {
		error: error.message,
		outcome: "failed",
		status: patchResponse.status,
		statusText: patchResponse.statusText,
	};
};

const applyRepositorySettings = async (
	accessToken: string,
	owner: string,
	repositoryName: string,
	actions: ManageRepositoryActions,
	options: ResolvedManageOptions
): Promise<{
	archive: ManageSettingResult | null;
	visibility: ManageSettingResult | null;
}> => {
	const { archiveAction, visibilityAction } = actions;
	const repositoryPathname = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}`;
	const wantsArchiveChange = archiveAction !== "current";
	const wantsVisibilityChange = visibilityAction !== "current";

	if (!(wantsArchiveChange || wantsVisibilityChange)) {
		return { archive: null, visibility: null };
	}

	try {
		const currentResponse = await fetchWithRateLimitRetry(
			() =>
				fetchGitHubResponse(
					repositoryPathname,
					accessToken,
					options.fetchImplementation
				),
			options
		);

		if (!currentResponse.ok) {
			const error = await createGitHubError(
				currentResponse,
				`Failed to load ${owner}/${repositoryName}.`
			);

			return createManageFailureResults(
				wantsArchiveChange,
				wantsVisibilityChange,
				{
					error: error.message,
					outcome: "failed",
					status: currentResponse.status,
					statusText: currentResponse.statusText,
				}
			);
		}

		const current =
			(await currentResponse.json()) as GitHubManagedRepositoryResponse;
		const { archive, body, visibility } = resolveRepositorySettingsBody(
			actions,
			current
		);

		if (body.archived === undefined && body.visibility === undefined) {
			return { archive, visibility };
		}

		const patchResult = await patchRepositorySettings(
			repositoryPathname,
			accessToken,
			repositoryName,
			body,
			options
		);

		return {
			archive: body.archived === undefined ? archive : patchResult,
			visibility:
				body.visibility === undefined ? visibility : { ...patchResult },
		};
	} catch (error) {
		return createManageFailureResults(
			wantsArchiveChange,
			wantsVisibilityChange,
			{
				error:
					error instanceof Error
						? error.message
						: "Repository settings update failed.",
				outcome: "failed",
				status: 0,
				statusText: "Request failed",
			}
		);
	}
};

const manageOneGitHubRepository = async (
	accessToken: string,
	owner: string,
	repositoryName: string,
	actions: ManageRepositoryActions,
	options: ResolvedManageOptions
): Promise<ManageRepositoryResult> => {
	const { subscriptionAction } = actions;
	const { archive, visibility } = await applyRepositorySettings(
		accessToken,
		owner,
		repositoryName,
		actions,
		options
	);
	const subscription =
		subscriptionAction === "current"
			? null
			: await applySubscriptionAction(
					accessToken,
					owner,
					repositoryName,
					subscriptionAction,
					options
				);
	const settingResults = [archive, subscription, visibility];
	const ok = !settingResults.some(
		(settingResult) => settingResult?.outcome === "failed"
	);

	return {
		archive,
		ok,
		repository: repositoryName,
		subscription,
		visibility,
	};
};

export async function manageGitHubRepositories(
	accessToken: string,
	owner: string,
	repositories: string[],
	actions: ManageRepositoryActions,
	fetchImplementation: typeof fetch = fetch,
	options: ManageGitHubRepositoriesOptions = {}
): Promise<ManageRepositoryResult[]> {
	const resolvedOptions: ResolvedManageOptions = {
		fetchImplementation,
		maxRateLimitAttempts:
			options.maxRateLimitAttempts ?? DEFAULT_MANAGE_RATE_LIMIT_ATTEMPTS,
		rateLimitDelayMs:
			options.rateLimitDelayMs ?? DEFAULT_MANAGE_RATE_LIMIT_DELAY_MS,
		sleep: options.sleep ?? sleep,
	};

	return await mapWithConcurrency(
		repositories,
		MAX_MANAGE_CONCURRENCY,
		(repositoryName) =>
			manageOneGitHubRepository(
				accessToken,
				owner,
				repositoryName,
				actions,
				resolvedOptions
			)
	);
}

export async function listGitHubWatchedRepositoryFullNames(
	accessToken: string,
	fetchImplementation: typeof fetch = fetch
): Promise<string[]> {
	const subscriptionsPathname = "/user/subscriptions";
	const firstResponse = await fetchGitHubResponse(
		createGitHubPaginatedPathname(subscriptionsPathname, 1),
		accessToken,
		fetchImplementation
	);
	const repositories = await fetchGitHubPaginatedJson<{ full_name: string }>(
		subscriptionsPathname,
		accessToken,
		fetchImplementation,
		firstResponse,
		"Failed to load your watched repositories."
	);

	return repositories.map((repository) => repository.full_name);
}
