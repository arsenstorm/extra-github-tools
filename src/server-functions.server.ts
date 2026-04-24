import { getGitHubAccessTokenFromHeaders } from "./auth.server";
import {
	analyzeGitHubRepository,
	isGitHubContributorStatsPendingError,
	listGitHubAccounts,
	listGitHubRepositories,
	transferGitHubRepositories,
} from "./github";
import type {
	FamePageData,
	FameSearchInput,
	TransferPageData,
	TransferRepositoriesInput,
	TransferRepositoriesResult,
	TransferSearchInput,
} from "./server-functions";

const GITHUB_ACCESS_REQUIRED_MESSAGE =
	"We couldn’t find your GitHub access or your session has expired. Please sign in again.";
const FAME_CONTRIBUTOR_STATS_ATTEMPTS = 1;

const toMessage = (error: unknown, fallbackMessage: string): string =>
	error instanceof Error ? error.message : fallbackMessage;

const getTransferResultError = (
	failedCount: number,
	settingsFailedCount: number
): string | null => {
	if (failedCount > 0 && settingsFailedCount > 0) {
		return `${failedCount} ${
			failedCount === 1 ? "repository" : "repositories"
		} failed to transfer, and ${settingsFailedCount} ${
			settingsFailedCount === 1 ? "settings update" : "settings updates"
		} failed.`;
	}

	if (failedCount > 0) {
		return `${failedCount} ${
			failedCount === 1 ? "repository" : "repositories"
		} failed to transfer.`;
	}

	if (settingsFailedCount > 0) {
		return `${settingsFailedCount} ${
			settingsFailedCount === 1 ? "settings update" : "settings updates"
		} failed after transfer.`;
	}

	return null;
};

export async function resolveTransferPageData(
	headers: Headers,
	search: TransferSearchInput
): Promise<TransferPageData> {
	const githubAuth = await getGitHubAccessTokenFromHeaders(headers);

	if (!githubAuth) {
		return {
			error: null,
			organizations: null,
			repositories: null,
		};
	}

	try {
		const organizations = await listGitHubAccounts(githubAuth.accessToken);

		if (!search.from) {
			return {
				error: null,
				organizations,
				repositories: null,
			};
		}

		if (!search.to) {
			return {
				error: null,
				organizations,
				repositories: null,
			};
		}

		return {
			error: null,
			organizations,
			repositories: await listGitHubRepositories(
				githubAuth.accessToken,
				search.from
			),
		};
	} catch (error) {
		return {
			error: toMessage(error, "Failed to load transfer data."),
			organizations: null,
			repositories: null,
		};
	}
}

export async function resolveFamePageData(
	headers: Headers,
	search: FameSearchInput
): Promise<FamePageData> {
	const githubAuth = await getGitHubAccessTokenFromHeaders(headers);

	if (!githubAuth) {
		return {
			error: null,
			organizations: null,
			repositories: null,
			stats: null,
			statsPending: false,
		};
	}

	try {
		if (!search.org) {
			return {
				error: null,
				organizations: await listGitHubAccounts(githubAuth.accessToken),
				repositories: null,
				stats: null,
				statsPending: false,
			};
		}

		if (!search.repo) {
			return {
				error: null,
				organizations: null,
				repositories: await listGitHubRepositories(
					githubAuth.accessToken,
					search.org
				),
				stats: null,
				statsPending: false,
			};
		}

		return {
			error: null,
			organizations: null,
			repositories: null,
			stats: await analyzeGitHubRepository(
				githubAuth.accessToken,
				search.org,
				search.repo,
				{
					maxContributorStatsAttempts: FAME_CONTRIBUTOR_STATS_ATTEMPTS,
				}
			),
			statsPending: false,
		};
	} catch (error) {
		if (isGitHubContributorStatsPendingError(error)) {
			return {
				error: null,
				organizations: null,
				repositories: null,
				stats: null,
				statsPending: true,
			};
		}

		return {
			error: toMessage(error, "Failed to load repository analysis."),
			organizations: null,
			repositories: null,
			stats: null,
			statsPending: false,
		};
	}
}

export async function runTransferRepositoriesAction(
	headers: Headers,
	data: TransferRepositoriesInput
): Promise<TransferRepositoriesResult> {
	const githubAuth = await getGitHubAccessTokenFromHeaders(headers);

	if (!githubAuth) {
		return {
			error: GITHUB_ACCESS_REQUIRED_MESSAGE,
			results: null,
			success: false,
		};
	}

	if (data.repositories.length === 0) {
		return {
			error: "Select at least one repository to transfer.",
			results: null,
			success: false,
		};
	}

	if (!(data.from && data.to)) {
		return {
			error: "Choose both a source and destination account.",
			results: null,
			success: false,
		};
	}

	if (data.from === data.to) {
		return {
			error: "Choose different source and destination accounts.",
			results: null,
			success: false,
		};
	}

	try {
		const results = await transferGitHubRepositories(
			githubAuth.accessToken,
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
	} catch (error) {
		return {
			error: toMessage(error, "Failed to transfer repositories."),
			results: null,
			success: false,
		};
	}
}
