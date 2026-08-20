import { getGitHubAccessTokenFromHeaders } from "./auth.server";
import { formatCount, formatRepositoryCount } from "./format";
import {
	getGitHubOrganizationSupportsInternal,
	isViewerAccount,
	listGitHubAccounts,
	listGitHubRepositories,
	listGitHubRepositoriesPage,
} from "./github/accounts";
import { analyzeGitHubRepository } from "./github/analysis";
import { manageGitHubRepositories } from "./github/manage";
import { transferGitHubRepositories } from "./github/transfer";
import { isGitHubContributorStatsPendingError } from "./github/types";
import type {
	FamePageData,
	FameSearchInput,
	GitHubAccountsData,
	GitHubAccountsInput,
	ManageRepositoriesInput,
	ManageRepositoriesResult,
	RepositoriesPage,
	RepositoriesPageInput,
	TransferRepositoriesInput,
	TransferRepositoriesResult,
} from "./server-functions";

const GITHUB_ACCESS_REQUIRED_MESSAGE =
	"We couldn’t find your GitHub access or your session has expired. Please sign in again.";
const FAME_CONTRIBUTOR_STATS_ATTEMPTS = 1;

const toMessage = (error: unknown, fallbackMessage: string): string =>
	error instanceof Error ? error.message : fallbackMessage;

/**
 * Resolves the viewer's GitHub token, then runs `load` with it. Returns
 * `withoutAccess` when there is no token and `onError` when `load` throws.
 */
const withGitHubAccess = async <Result>(
	headers: Headers,
	handlers: {
		load: (accessToken: string) => Promise<Result>;
		onError: (error: unknown) => Result;
		withoutAccess: Result;
	}
): Promise<Result> => {
	const githubAuth = await getGitHubAccessTokenFromHeaders(headers);

	if (!githubAuth) {
		return handlers.withoutAccess;
	}

	try {
		return await handlers.load(githubAuth.accessToken);
	} catch (error) {
		return handlers.onError(error);
	}
};

const actionFailure = (
	error: string
): { error: string; results: null; success: false } => ({
	error,
	results: null,
	success: false,
});

export function resolveGitHubAccounts(
	headers: Headers,
	input: GitHubAccountsInput
): Promise<GitHubAccountsData> {
	return withGitHubAccess<GitHubAccountsData>(headers, {
		load: async (accessToken) => ({
			accounts: await listGitHubAccounts(accessToken, fetch, {
				viewer: input.viewer,
			}),
			error: null,
		}),
		onError: (error) => ({
			accounts: null,
			error: toMessage(error, "Failed to load your GitHub accounts."),
		}),
		withoutAccess: { accounts: null, error: null },
	});
}

const EMPTY_REPOSITORIES_PAGE: RepositoriesPage = {
	error: null,
	nextCursor: null,
	repositories: null,
	supportsInternalVisibility: false,
	totalCount: 0,
};

/**
 * Whether "internal" visibility applies to the account. Only organizations on
 * an enterprise plan have it, so personal accounts and later pages skip the
 * lookup; a page that already contains an internal repository settles it.
 */
const resolveSupportsInternalVisibility = async (
	accessToken: string,
	input: RepositoriesPageInput,
	repositories: RepositoriesPage["repositories"]
): Promise<boolean> => {
	if (
		repositories?.some((repository) => repository.visibility === "internal")
	) {
		return true;
	}

	if (input.cursor || isViewerAccount(input.account, input.viewerLogin)) {
		return false;
	}

	return await getGitHubOrganizationSupportsInternal(
		accessToken,
		input.account
	);
};

/** One page of an account's repositories with the viewer's subscription state. */
export function resolveRepositoriesPage(
	headers: Headers,
	input: RepositoriesPageInput
): Promise<RepositoriesPage> {
	if (!input.account) {
		return Promise.resolve(EMPTY_REPOSITORIES_PAGE);
	}

	return withGitHubAccess<RepositoriesPage>(headers, {
		load: async (accessToken) => {
			const page = await listGitHubRepositoriesPage(
				accessToken,
				input.account,
				{
					cursor: input.cursor,
				}
			);

			return {
				error: null,
				nextCursor: page.nextCursor,
				repositories: page.repositories,
				supportsInternalVisibility: await resolveSupportsInternalVisibility(
					accessToken,
					input,
					page.repositories
				),
				totalCount: page.totalCount,
			};
		},
		onError: (error) => ({
			...EMPTY_REPOSITORIES_PAGE,
			error: toMessage(error, "Failed to load repositories."),
		}),
		withoutAccess: EMPTY_REPOSITORIES_PAGE,
	});
}

const EMPTY_FAME_PAGE_DATA: FamePageData = {
	error: null,
	organizations: null,
	repositories: null,
	stats: null,
	statsPending: false,
};

const loadFamePageData = async (
	accessToken: string,
	search: FameSearchInput
): Promise<FamePageData> => {
	if (!search.org) {
		return {
			...EMPTY_FAME_PAGE_DATA,
			organizations: await listGitHubAccounts(accessToken),
		};
	}

	if (!search.repo) {
		return {
			...EMPTY_FAME_PAGE_DATA,
			repositories: await listGitHubRepositories(accessToken, search.org),
		};
	}

	return {
		...EMPTY_FAME_PAGE_DATA,
		stats: await analyzeGitHubRepository(accessToken, search.org, search.repo, {
			maxContributorStatsAttempts: FAME_CONTRIBUTOR_STATS_ATTEMPTS,
		}),
	};
};

export function resolveFamePageData(
	headers: Headers,
	search: FameSearchInput
): Promise<FamePageData> {
	return withGitHubAccess<FamePageData>(headers, {
		load: (accessToken) => loadFamePageData(accessToken, search),
		onError: (error) =>
			isGitHubContributorStatsPendingError(error)
				? { ...EMPTY_FAME_PAGE_DATA, statsPending: true }
				: {
						...EMPTY_FAME_PAGE_DATA,
						error: toMessage(error, "Failed to load repository analysis."),
					},
		withoutAccess: EMPTY_FAME_PAGE_DATA,
	});
}

const getTransferResultError = (
	failedCount: number,
	settingsFailedCount: number
): string | null => {
	const failedLabel = `${formatRepositoryCount(failedCount)} failed to transfer`;
	const settingsFailedLabel = formatCount(
		settingsFailedCount,
		"settings update",
		"settings updates"
	);

	if (failedCount > 0 && settingsFailedCount > 0) {
		return `${failedLabel}, and ${settingsFailedLabel} failed.`;
	}

	if (failedCount > 0) {
		return `${failedLabel}.`;
	}

	if (settingsFailedCount > 0) {
		return `${settingsFailedLabel} failed after transfer.`;
	}

	return null;
};

const getTransferInputError = (
	data: TransferRepositoriesInput
): string | null => {
	if (data.repositories.length === 0) {
		return "Select at least one repository to transfer.";
	}

	if (!(data.from && data.to)) {
		return "Choose both a source and destination account.";
	}

	if (data.from === data.to) {
		return "Choose different source and destination accounts.";
	}

	return null;
};

export function runTransferRepositoriesAction(
	headers: Headers,
	data: TransferRepositoriesInput
): Promise<TransferRepositoriesResult> {
	const inputError = getTransferInputError(data);

	if (inputError) {
		return Promise.resolve(actionFailure(inputError));
	}

	return withGitHubAccess<TransferRepositoriesResult>(headers, {
		load: async (accessToken) => {
			const results = await transferGitHubRepositories(
				accessToken,
				data.from,
				data.to,
				data.repositories,
				fetch,
				{
					archiveState: data.archiveState,
					namePrefix: data.namePrefix,
					nameSuffix: data.nameSuffix,
					visibility: data.visibility,
				}
			);
			const failedCount = results.filter((result) => !result.ok).length;
			const settingsFailedCount = results.filter(
				(result) => result.postTransferSettings?.ok === false
			).length;

			return {
				error: getTransferResultError(failedCount, settingsFailedCount),
				results,
				success: failedCount === 0 && settingsFailedCount === 0,
			};
		},
		onError: (error) =>
			actionFailure(toMessage(error, "Failed to transfer repositories.")),
		withoutAccess: actionFailure(GITHUB_ACCESS_REQUIRED_MESSAGE),
	});
}

const getManageInputError = (data: ManageRepositoriesInput): string | null => {
	if (data.changes.length === 0) {
		return "Select at least one change to apply.";
	}

	if (!data.account) {
		return "Choose an account.";
	}

	return null;
};

export function runManageRepositoriesAction(
	headers: Headers,
	data: ManageRepositoriesInput
): Promise<ManageRepositoriesResult> {
	const inputError = getManageInputError(data);

	if (inputError) {
		return Promise.resolve(actionFailure(inputError));
	}

	return withGitHubAccess<ManageRepositoriesResult>(headers, {
		load: async (accessToken) => {
			const results = await manageGitHubRepositories(
				accessToken,
				data.account,
				data.changes.map((change) => ({
					actions: {
						archiveAction: change.archiveAction ?? "current",
						subscriptionAction: change.subscriptionAction ?? "current",
						visibilityAction: change.visibilityAction ?? "current",
					},
					repository: change.repository,
				}))
			);
			const failedCount = results.filter((result) => !result.ok).length;

			return {
				error:
					failedCount > 0
						? `${formatRepositoryCount(failedCount)} failed to update.`
						: null,
				results,
				success: failedCount === 0,
			};
		},
		onError: (error) =>
			actionFailure(toMessage(error, "Failed to update repositories.")),
		withoutAccess: actionFailure(GITHUB_ACCESS_REQUIRED_MESSAGE),
	});
}
