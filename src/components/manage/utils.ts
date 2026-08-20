import { toast } from "sonner";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryResult,
	ManageSettingResult,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "@/github";
import {
	MANAGE_VISIBILITY_ACTION_OPTIONS,
	MANAGE_VISIBILITY_TARGET_OPTIONS,
	type ManageRepositoryStatus,
} from "./types";

export interface ManageResultCounts {
	changedCount: number;
	failedCount: number;
	unchangedCount: number;
}

const getSettingResults = (
	result: ManageRepositoryResult
): Array<ManageSettingResult | null> => [
	result.archive,
	result.visibility,
	result.subscription,
];

const hasChangedSetting = (result: ManageRepositoryResult): boolean =>
	getSettingResults(result).some(
		(settingResult) => settingResult?.outcome === "changed"
	);

export const getManageResultCounts = (
	results: ManageRepositoryResult[]
): ManageResultCounts => {
	let changedCount = 0;
	let failedCount = 0;
	let unchangedCount = 0;

	for (const result of results) {
		if (!result.ok) {
			failedCount += 1;
		} else if (hasChangedSetting(result)) {
			changedCount += 1;
		} else {
			unchangedCount += 1;
		}
	}

	return { changedCount, failedCount, unchangedCount };
};

export const getManageResultLabel = (
	result: ManageRepositoryResult
): string => {
	if (!result.ok) {
		return "Failed";
	}

	return hasChangedSetting(result) ? "Updated" : "No change needed";
};

const getSettingFailureDetail = (
	settingResult: ManageSettingResult
): string => {
	const statusDetail = `${settingResult.status} ${settingResult.statusText}`;

	return settingResult.error
		? `${statusDetail} — ${settingResult.error}`
		: statusDetail;
};

const getSettingOutcomeLabel = (settingResult: ManageSettingResult): string => {
	if (settingResult.outcome === "changed") {
		return "updated";
	}

	if (settingResult.outcome === "unchanged") {
		return "no change needed";
	}

	return `failed (${getSettingFailureDetail(settingResult)})`;
};

export const getManageResultDetails = (
	result: ManageRepositoryResult
): string => {
	const settingLabels: [string, ManageSettingResult | null][] = [
		["Archived", result.archive],
		["Visibility", result.visibility],
		["Notifications", result.subscription],
	];
	const details = settingLabels
		.filter(
			(entry): entry is [string, ManageSettingResult] => entry[1] !== null
		)
		.map(
			([label, settingResult]) =>
				`${label}: ${getSettingOutcomeLabel(settingResult)}`
		);

	return details.length > 0 ? details.join("; ") : "No settings requested.";
};

const VISIBILITY_ACTION_SUMMARIES = {
	internal: "make internal",
	private: "make private",
	public: "make public",
} as const;

const SUBSCRIPTION_ACTION_SUMMARIES = {
	ignoring: "ignore notifications",
	unwatching: "stop watching",
	watching: "watch all activity",
} as const;

export const getManageActionsSummary = (
	actions: ManageRepositoryActions
): string => {
	const summaries: string[] = [];

	if (actions.archiveAction === "archived") {
		summaries.push("archive");
	} else if (actions.archiveAction === "unarchived") {
		summaries.push("unarchive");
	}

	if (actions.visibilityAction !== "current") {
		summaries.push(VISIBILITY_ACTION_SUMMARIES[actions.visibilityAction]);
	}

	if (actions.subscriptionAction !== "current") {
		summaries.push(SUBSCRIPTION_ACTION_SUMMARIES[actions.subscriptionAction]);
	}

	return summaries.join("; ");
};

export const getRepositorySubscriptionDisplayState = (
	repositoryName: string,
	watchedRepositories: Set<string>
): RepositorySubscriptionState =>
	watchedRepositories.has(repositoryName) ? "watching" : "unwatching";

const SUBSCRIPTION_STATE_LABELS = {
	ignoring: "ignoring",
	unwatching: "not watching",
	watching: "watching",
} as const;

const getArchiveChangeLine = (
	repository: GitHubRepository,
	actions: ManageRepositoryActions
): string | null => {
	if (actions.archiveAction === "current") {
		return null;
	}

	const targetArchived = actions.archiveAction === "archived";

	if (targetArchived === repository.archived) {
		return null;
	}

	return `Archived: ${repository.archived ? "yes" : "no"} → ${
		targetArchived ? "yes" : "no"
	}`;
};

const getVisibilityChangeLine = (
	repository: GitHubRepository,
	actions: ManageRepositoryActions
): string | null => {
	if (
		actions.visibilityAction === "current" ||
		actions.visibilityAction === repository.visibility
	) {
		return null;
	}

	return `Visibility: ${repository.visibility} → ${actions.visibilityAction}`;
};

const getSubscriptionChangeLine = (
	repository: GitHubRepository,
	actions: ManageRepositoryActions,
	watchedRepositories: Set<string> | null
): string | null => {
	if (actions.subscriptionAction === "current") {
		return null;
	}

	const targetLabel = SUBSCRIPTION_STATE_LABELS[actions.subscriptionAction];

	if (!watchedRepositories) {
		return `Notifications: set to ${targetLabel}`;
	}

	const currentState = getRepositorySubscriptionDisplayState(
		repository.name,
		watchedRepositories
	);

	if (actions.subscriptionAction === currentState) {
		return null;
	}

	return `Notifications: ${SUBSCRIPTION_STATE_LABELS[currentState]} → ${targetLabel}`;
};

export const getRepositoryChangeLines = (
	repository: GitHubRepository,
	actions: ManageRepositoryActions,
	watchedRepositories: Set<string> | null
): string[] =>
	[
		getArchiveChangeLine(repository, actions),
		getVisibilityChangeLine(repository, actions),
		getSubscriptionChangeLine(repository, actions, watchedRepositories),
	].filter((line): line is string => line !== null);

export const getManageVisibilityActionOptions = (
	supportsInternalVisibility: boolean
): ReadonlyArray<{
	label: string;
	value: ManageRepositoryActions["visibilityAction"];
}> =>
	MANAGE_VISIBILITY_ACTION_OPTIONS.filter(
		(option) => supportsInternalVisibility || option.value !== "internal"
	);

export const getManageVisibilityTargetOptions = (
	supportsInternalVisibility: boolean
): ReadonlyArray<{
	label: string;
	value: RepositoryVisibility;
}> =>
	MANAGE_VISIBILITY_TARGET_OPTIONS.filter(
		(option) => supportsInternalVisibility || option.value !== "internal"
	);

export const getManageRepositoryStatus = (
	repositoryName: string,
	pendingRepositories: Set<string>,
	resultsByRepository: Map<string, ManageRepositoryResult>
): ManageRepositoryStatus => {
	if (pendingRepositories.has(repositoryName)) {
		return "pending";
	}

	const result = resultsByRepository.get(repositoryName);

	if (!result) {
		return "idle";
	}

	if (!result.ok) {
		return "failed";
	}

	return hasChangedSetting(result) ? "updated" : "unchanged";
};

const getCountLabel = (
	count: number,
	singularLabel: string,
	pluralLabel: string
): string => `${count} ${count === 1 ? singularLabel : pluralLabel}`;

export const showManageResultToast = (
	results: ManageRepositoryResult[],
	runError: string | null
): void => {
	const { changedCount, failedCount } = getManageResultCounts(results);

	if (runError) {
		toast.error(
			results.length > 0
				? `${runError} ${getCountLabel(
						changedCount,
						"repository",
						"repositories"
					)} updated before the run stopped.`
				: runError
		);
		return;
	}

	if (failedCount > 0) {
		toast.error(
			`${getCountLabel(
				failedCount,
				"repository",
				"repositories"
			)} failed to update.`
		);
		return;
	}

	if (changedCount > 0) {
		toast.success(
			`${getCountLabel(changedCount, "repository", "repositories")} updated.`
		);
		return;
	}

	toast.success("No changes were needed.");
};
