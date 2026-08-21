import { createServerFn } from "@tanstack/react-start";
import type {
	GitHubAccount,
	GitHubRepository,
	GitHubViewer,
	ManageRepositoryArchiveAction,
	ManageRepositoryResult,
	ManageRepositorySubscriptionAction,
	ManageRepositoryVisibilityAction,
	RepoStats,
	TransferRepositoryArchiveState,
	TransferRepositoryResult,
	TransferRepositoryVisibility,
} from "./github/types";
import {
	validateFameSearchInput,
	validateGitHubAccountsInput,
	validateManageRepositoriesInput,
	validateRepositoriesPageInput,
	validateTransferRepositoriesInput,
} from "./server-functions.validation";

export interface TransferSearchInput {
	from?: string;
	to?: string;
}

export interface GitHubAccountsInput {
	/** The viewer from the session, so the server can skip re-fetching `/user`. */
	viewer?: Pick<GitHubViewer, "avatarUrl" | "id" | "login">;
}

export interface GitHubAccountsData {
	accounts: GitHubAccount[] | null;
	error: string | null;
}

export interface RepositoriesPageInput {
	account: string;
	/** Cursor of the page to load; omit for the first page. */
	cursor?: string;
	/** Lets the server skip organization-only lookups when the account is the viewer. */
	viewerLogin?: string;
}

export interface RepositoriesPage {
	error: string | null;
	/** Cursor for the next page, or null when this is the last (or only) page. */
	nextCursor: string | null;
	repositories: GitHubRepository[] | null;
	/** Whether "internal" visibility applies; decided from the first page. */
	supportsInternalVisibility: boolean;
	/** The account's total number of repositories (0 when unknown). */
	totalCount: number;
}

export interface TransferRepositoriesInput {
	archiveState?: TransferRepositoryArchiveState;
	from: string;
	namePrefix?: string;
	nameSuffix?: string;
	repositories: string[];
	to: string;
	visibility?: TransferRepositoryVisibility;
}

export interface TransferRepositoriesResult {
	error: string | null;
	results: TransferRepositoryResult[] | null;
	success: boolean;
}

export interface FameSearchInput {
	org?: string;
	repo?: string;
}

export interface FamePageData {
	error: string | null;
	stats: RepoStats | null;
	statsPending: boolean;
}

export interface ManageRepositoryChangeInput {
	archiveAction?: ManageRepositoryArchiveAction;
	repository: string;
	subscriptionAction?: ManageRepositorySubscriptionAction;
	visibilityAction?: ManageRepositoryVisibilityAction;
}

export interface ManageRepositoriesInput {
	account: string;
	changes: ManageRepositoryChangeInput[];
}

export interface ManageRepositoriesResult {
	error: string | null;
	results: ManageRepositoryResult[] | null;
	success: boolean;
}

type ServerModule = typeof import("./server-functions.server");

/**
 * Runs `handle` with the server-only module and the request headers. Both
 * imports stay dynamic so the GitHub client never ships to the browser.
 */
const onServer = async <Result>(
	handle: (server: ServerModule, headers: Headers) => Promise<Result>
): Promise<Result> => {
	const [{ getRequestHeaders }, server] = await Promise.all([
		import("@tanstack/react-start/server"),
		import("./server-functions.server"),
	]);

	return handle(server, getRequestHeaders());
};

export const getGitHubAccounts = createServerFn({ method: "GET" })
	.validator(validateGitHubAccountsInput)
	.handler(({ data }) =>
		onServer((server, headers) => server.resolveGitHubAccounts(headers, data))
	);

export const getRepositoriesPage = createServerFn({ method: "GET" })
	.validator(validateRepositoriesPageInput)
	.handler(({ data }) =>
		onServer((server, headers) => server.resolveRepositoriesPage(headers, data))
	);

export const transferRepositoriesAction = createServerFn({ method: "POST" })
	.validator(validateTransferRepositoriesInput)
	.handler(({ data }) =>
		onServer((server, headers) =>
			server.runTransferRepositoriesAction(headers, data)
		)
	);

export const getFamePageData = createServerFn({ method: "GET" })
	.validator(validateFameSearchInput)
	.handler(({ data }) =>
		onServer((server, headers) => server.resolveFamePageData(headers, data))
	);

export const manageRepositoriesAction = createServerFn({ method: "POST" })
	.validator(validateManageRepositoriesInput)
	.handler(({ data }) =>
		onServer((server, headers) =>
			server.runManageRepositoriesAction(headers, data)
		)
	);
