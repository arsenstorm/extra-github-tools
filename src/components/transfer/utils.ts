import { toast } from "sonner";
import type { GitHubRepository, TransferRepositoryResult } from "@/github";
import type { TransferRepositoriesResult } from "@/server-functions";
import type {
	RepositorySort,
	RepositoryStatus,
	RepositoryTransferOptions,
} from "./types";

export const getGitHubAccessRefreshDescription = (): string =>
	"Your session is active, but GitHub access is unavailable. Sign in with GitHub again to continue.";

export const formatRepositoryPushedAt = (pushedAt: string | null): string => {
	if (!pushedAt) {
		return "Never pushed";
	}

	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
		year: "numeric",
	}).format(new Date(pushedAt));
};

const getRepositoryPushedAtTimestamp = (pushedAt: string | null): number => {
	if (!pushedAt) {
		return 0;
	}

	const timestamp = Date.parse(pushedAt);

	return Number.isNaN(timestamp) ? 0 : timestamp;
};

const compareRepositoryNames = (
	firstRepository: GitHubRepository,
	secondRepository: GitHubRepository
): number => firstRepository.name.localeCompare(secondRepository.name);

export const sortRepositories = (
	repositories: GitHubRepository[],
	repositorySort: RepositorySort
): GitHubRepository[] => {
	if (repositorySort === "default") {
		return repositories;
	}

	const direction = repositorySort === "pushed-desc" ? -1 : 1;

	return [...repositories].sort((firstRepository, secondRepository) => {
		const pushedAtDifference =
			(getRepositoryPushedAtTimestamp(firstRepository.pushedAt) -
				getRepositoryPushedAtTimestamp(secondRepository.pushedAt)) *
			direction;

		return (
			pushedAtDifference ||
			compareRepositoryNames(firstRepository, secondRepository)
		);
	});
};

export const getSelectedRepositoryNames = (
	repositoryNames: Iterable<string>,
	repositories: GitHubRepository[]
): string[] => {
	const selectedRepositoryNames = new Set(repositoryNames);

	return repositories
		.filter((repository) => selectedRepositoryNames.has(repository.name))
		.map((repository) => repository.name);
};

export const getRepositoryPageCount = (
	repositoryCount: number,
	repositoriesPerPage: number
): number => Math.max(1, Math.ceil(repositoryCount / repositoriesPerPage));

export const clampRepositoryPage = (page: number, pageCount: number): number =>
	Math.min(Math.max(page, 1), pageCount);

export const getRepositoryStatus = (
	repositoryName: string,
	pendingRepositories: Set<string>,
	resultsByRepository: Map<string, TransferRepositoryResult>
): RepositoryStatus => {
	if (pendingRepositories.has(repositoryName)) {
		return "pending";
	}

	const result = resultsByRepository.get(repositoryName);

	if (!result) {
		return "idle";
	}

	return result.ok ? "transferred" : "failed";
};

export const getTransferredRepositoryName = (
	repositoryName: string,
	transferOptions: Pick<RepositoryTransferOptions, "namePrefix" | "nameSuffix">
): string =>
	`${transferOptions.namePrefix}${repositoryName}${transferOptions.nameSuffix}`;

export const getPostTransferSettingsSummary = (
	transferOptions: RepositoryTransferOptions
): string => {
	const settings: string[] = [];

	if (transferOptions.visibility !== "current") {
		settings.push(
			`make ${transferOptions.visibility === "private" ? "private" : "public"}`
		);
	}

	if (transferOptions.archiveState === "archived") {
		settings.push("archive");
	} else if (transferOptions.archiveState === "unarchived") {
		settings.push("unarchive");
	}

	return settings.length > 0
		? settings.join("; ")
		: "keep current visibility and archive state";
};

export const getPostTransferSettingsFailureCount = (
	results: TransferRepositoryResult[] | null
): number =>
	results?.filter((result) => result.postTransferSettings?.ok === false)
		.length ?? 0;

export const getTransferResultDetails = (
	result: TransferRepositoryResult
): string => {
	if (!result.ok) {
		return result.error ?? `${result.status} ${result.statusText}`;
	}

	if (result.postTransferSettings?.ok === false) {
		return `Transferred, but settings update failed: ${
			result.postTransferSettings.error ??
			`${result.postTransferSettings.status} ${result.postTransferSettings.statusText}`
		}`;
	}

	if (result.postTransferSettings?.ok) {
		return `Transferred; settings updated (${result.postTransferSettings.status} ${result.postTransferSettings.statusText}).`;
	}

	return `${result.status} ${result.statusText}`;
};

export const getTransferResultLabel = (
	result: TransferRepositoryResult
): string => {
	if (!result.ok) {
		return "Failed";
	}

	if (result.postTransferSettings?.ok === false) {
		return "Transferred; settings failed";
	}

	return "Transferred";
};

export const isTransferResultComplete = (
	result: TransferRepositoryResult
): boolean => result.ok && result.postTransferSettings?.ok !== false;

const getCountLabel = (
	count: number,
	singularLabel: string,
	pluralLabel: string
): string => `${count} ${count === 1 ? singularLabel : pluralLabel}`;

const getTransferFailureToastMessage = (
	failedCount: number,
	settingsFailedCount: number
): string => {
	const failureMessages: string[] = [];

	if (failedCount > 0) {
		failureMessages.push(
			`${getCountLabel(failedCount, "repository", "repositories")} failed to transfer`
		);
	}

	if (settingsFailedCount > 0) {
		failureMessages.push(
			`${getCountLabel(
				settingsFailedCount,
				"settings update",
				"settings updates"
			)} failed`
		);
	}

	return `${failureMessages.join("; ")}.`;
};

export const getTransferResultCounts = (
	result: TransferRepositoriesResult
): {
	failedCount: number;
	settingsFailedCount: number;
	transferredCount: number;
} => {
	const transferredCount =
		result.results?.filter((transferResult) => transferResult.ok).length ?? 0;
	const failedCount =
		result.results?.filter((transferResult) => !transferResult.ok).length ?? 0;

	return {
		failedCount,
		settingsFailedCount: getPostTransferSettingsFailureCount(result.results),
		transferredCount,
	};
};

export const showTransferResultToast = (
	result: TransferRepositoriesResult
): void => {
	const { failedCount, settingsFailedCount, transferredCount } =
		getTransferResultCounts(result);

	if (result.success) {
		toast.success(
			`${getCountLabel(
				transferredCount,
				"repository",
				"repositories"
			)} transferred.`
		);
		return;
	}

	if (result.results) {
		toast.error(
			getTransferFailureToastMessage(failedCount, settingsFailedCount)
		);
		return;
	}

	toast.error(result.error ?? "Failed to transfer repositories.");
};
