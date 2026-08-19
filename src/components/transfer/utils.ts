import { toast } from "sonner";
import type { TransferRepositoryResult } from "@/github";
import type { TransferRepositoriesResult } from "@/server-functions";
import type { RepositoryStatus, RepositoryTransferOptions } from "./types";

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
