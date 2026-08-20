import {
	createGitHubPaginatedPathname,
	createRequestContext,
	fetchGitHubJson,
	fetchGitHubPaginatedJson,
	fetchGitHubResponse,
	type GitHubRequestContext,
	jsonRequestInit,
} from "./client";
import type {
	GitHubAccount,
	GitHubRepository,
	GitHubViewer,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "./types";

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

interface GitHubOrganizationInfoResponse {
	plan?: {
		name?: string | null;
	} | null;
}

export async function getGitHubViewer(
	accessToken: string,
	fetchImplementation: typeof fetch = fetch
): Promise<GitHubViewer> {
	const viewer = await fetchGitHubJson<GitHubViewerResponse>(
		createRequestContext(accessToken, fetchImplementation),
		"/user",
		"Failed to load the current GitHub user."
	);

	return {
		avatarUrl: viewer.avatar_url,
		htmlUrl: viewer.html_url,
		id: viewer.id,
		login: viewer.login,
		name: viewer.name,
	};
}

/** Whether `account` is the signed-in user's own account (GitHub logins are case-insensitive). */
export const isViewerAccount = (
	account: string,
	viewerLogin: string | undefined
): boolean => viewerLogin?.toLowerCase() === account.toLowerCase();

const toAccount = (account: GitHubOrganizationResponse): GitHubAccount => ({
	avatar: account.avatar_url,
	handle: account.login,
	id: account.id,
});

export interface ListGitHubAccountsOptions {
	/** An already-loaded viewer; when given, `/user` is not requested again. */
	viewer?: Pick<GitHubViewer, "avatarUrl" | "id" | "login">;
}

const viewerToAccountResponse = (
	viewer: NonNullable<ListGitHubAccountsOptions["viewer"]>
): GitHubOrganizationResponse => ({
	avatar_url: viewer.avatarUrl,
	id: viewer.id,
	login: viewer.login,
});

/** The viewer's own account followed by the organizations they belong to. */
export async function listGitHubAccounts(
	accessToken: string,
	fetchImplementation: typeof fetch = fetch,
	options: ListGitHubAccountsOptions = {}
): Promise<GitHubAccount[]> {
	const context = createRequestContext(accessToken, fetchImplementation);
	const [user, organizations] = await Promise.all([
		options.viewer
			? viewerToAccountResponse(options.viewer)
			: fetchGitHubJson<GitHubViewerResponse>(
					context,
					"/user",
					"Failed to load the current GitHub account."
				),
		fetchGitHubJson<GitHubOrganizationResponse[]>(
			context,
			"/user/orgs",
			"Failed to load your GitHub organizations."
		),
	]);

	return [user, ...organizations].map(toAccount);
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

const toRepository = (
	repository: GitHubRepositoryResponse
): GitHubRepository => ({
	archived: repository.archived,
	fork: repository.fork,
	fullName: repository.full_name,
	htmlUrl: repository.html_url,
	id: repository.id,
	name: repository.name,
	private: repository.private,
	pushedAt: repository.pushed_at,
	subscription: null,
	visibility: toRepositoryVisibility(repository.visibility, repository.private),
});

/** Lists an organization's repositories, or returns null when `account` is not an organization. */
const listOrganizationRepositories = async (
	context: GitHubRequestContext,
	account: string,
	fallbackMessage: string
): Promise<GitHubRepositoryResponse[] | null> => {
	const pathname = `/orgs/${encodeURIComponent(account)}/repos`;
	const firstResponse = await fetchGitHubResponse(
		context,
		createGitHubPaginatedPathname(pathname, 1)
	);

	if (firstResponse.status === 404) {
		return null;
	}

	return fetchGitHubPaginatedJson<GitHubRepositoryResponse>(
		context,
		pathname,
		fallbackMessage,
		firstResponse
	);
};

const listOwnedRepositories = async (
	context: GitHubRequestContext,
	account: string,
	fallbackMessage: string
): Promise<GitHubRepositoryResponse[]> => {
	const accountPrefix = `${account.toLowerCase()}/`;
	const repositories = await fetchGitHubPaginatedJson<GitHubRepositoryResponse>(
		context,
		"/user/repos?affiliation=owner",
		fallbackMessage
	);

	return repositories.filter((repository) =>
		repository.full_name.toLowerCase().startsWith(accountPrefix)
	);
};

export interface ListGitHubRepositoriesOptions {
	/** The signed-in user's login; when it matches `account`, the org lookup is skipped. */
	viewerLogin?: string;
}

export async function listGitHubRepositories(
	accessToken: string,
	account: string,
	fetchImplementation: typeof fetch = fetch,
	options: ListGitHubRepositoriesOptions = {}
): Promise<GitHubRepository[]> {
	const context = createRequestContext(accessToken, fetchImplementation);
	const fallbackMessage = `Failed to load repositories for ${account}.`;
	const repositories = isViewerAccount(account, options.viewerLogin)
		? await listOwnedRepositories(context, account, fallbackMessage)
		: ((await listOrganizationRepositories(
				context,
				account,
				fallbackMessage
			)) ?? (await listOwnedRepositories(context, account, fallbackMessage)));

	return repositories.map(toRepository);
}

const REPOSITORIES_PAGE_SIZE = 100;
const REPOSITORIES_PAGE_QUERY = `
	query RepositoriesPage($login: String!, $cursor: String, $first: Int!) {
		repositoryOwner(login: $login) {
			repositories(first: $first, after: $cursor, ownerAffiliations: [OWNER]) {
				totalCount
				nodes {
					databaseId
					isArchived
					isFork
					isPrivate
					name
					nameWithOwner
					pushedAt
					url
					viewerSubscription
					visibility
				}
				pageInfo {
					endCursor
					hasNextPage
				}
			}
		}
	}
`;

type GitHubViewerSubscription = "IGNORED" | "SUBSCRIBED" | "UNSUBSCRIBED";

interface GitHubRepositoryNode {
	databaseId: number | null;
	isArchived: boolean;
	isFork: boolean;
	isPrivate: boolean;
	name: string;
	nameWithOwner: string;
	pushedAt: string | null;
	url: string;
	viewerSubscription: GitHubViewerSubscription | null;
	visibility: "INTERNAL" | "PRIVATE" | "PUBLIC";
}

interface GitHubRepositoriesPageResponse {
	data?: {
		repositoryOwner: {
			repositories: {
				nodes: GitHubRepositoryNode[];
				pageInfo: { endCursor: string | null; hasNextPage: boolean };
				totalCount: number;
			};
		} | null;
	} | null;
	errors?: Array<{ message: string }>;
}

export interface GitHubRepositoriesPage {
	/** Cursor for the next page, or null on the last page. */
	nextCursor: string | null;
	repositories: GitHubRepository[];
	/** The account's total number of repositories. */
	totalCount: number;
}

export interface ListGitHubRepositoriesPageOptions {
	cursor?: string;
	fetchImplementation?: typeof fetch;
}

const SUBSCRIPTION_STATES: Record<
	GitHubViewerSubscription,
	RepositorySubscriptionState
> = {
	IGNORED: "ignoring",
	SUBSCRIBED: "watching",
	UNSUBSCRIBED: "unwatching",
};

const toRepositoryFromNode = (
	node: GitHubRepositoryNode
): GitHubRepository => ({
	archived: node.isArchived,
	fork: node.isFork,
	fullName: node.nameWithOwner,
	htmlUrl: node.url,
	id: node.databaseId ?? 0,
	name: node.name,
	private: node.isPrivate,
	pushedAt: node.pushedAt,
	subscription: node.viewerSubscription
		? SUBSCRIPTION_STATES[node.viewerSubscription]
		: null,
	visibility: node.visibility.toLowerCase() as RepositoryVisibility,
});

/**
 * One page of the account's repositories, including the viewer's notification
 * subscription for each, from a single GraphQL query. Works for users and
 * organizations alike.
 */
export async function listGitHubRepositoriesPage(
	accessToken: string,
	account: string,
	options: ListGitHubRepositoriesPageOptions = {}
): Promise<GitHubRepositoriesPage> {
	const context = createRequestContext(
		accessToken,
		options.fetchImplementation
	);
	const fallbackMessage = `Failed to load repositories for ${account}.`;
	const response = await fetchGitHubJson<GitHubRepositoriesPageResponse>(
		context,
		"/graphql",
		fallbackMessage,
		jsonRequestInit("POST", {
			query: REPOSITORIES_PAGE_QUERY,
			variables: {
				cursor: options.cursor ?? null,
				first: REPOSITORIES_PAGE_SIZE,
				login: account,
			},
		})
	);
	const page = response.data?.repositoryOwner?.repositories;

	if (!page) {
		throw new Error(response.errors?.[0]?.message ?? fallbackMessage);
	}

	return {
		nextCursor: page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
		repositories: page.nodes.map(toRepositoryFromNode),
		totalCount: page.totalCount,
	};
}

export async function getGitHubOrganizationSupportsInternal(
	accessToken: string,
	account: string,
	fetchImplementation: typeof fetch = fetch
): Promise<boolean> {
	const response = await fetchGitHubResponse(
		createRequestContext(accessToken, fetchImplementation),
		`/orgs/${encodeURIComponent(account)}`
	);

	if (!response.ok) {
		return false;
	}

	const organization =
		(await response.json()) as GitHubOrganizationInfoResponse;

	return organization.plan?.name?.toLowerCase() === "enterprise";
}
