import { toast } from "sonner";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryResult,
	ManageSettingResult,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "@/github";
import type { ManageRepositoryChangeInput } from "@/server-functions";
import {
	MANAGE_VISIBILITY_ACTION_OPTIONS,
	MANAGE_VISIBILITY_STATE_OPTIONS,
	type ManageRepositoryStatus,
} from "./types";

export interface ManageResultCounts {
	changedCount: number;
	failedCount: number;
	unchangedCount: number;
}

export interface RepositoryPendingChange {
	archived?: boolean;
	subscription?: RepositorySubscriptionState;
	visibility?: RepositoryVisibility;
}

export type StagePendingFieldHandler = <
	Field extends keyof RepositoryPendingChange,
>(
	repositoryName: string,
	field: Field,
	target: RepositoryPendingChange[Field],
	currentValue: RepositoryPendingChange[Field]
) => void;

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

export const withPendingField = <Field extends keyof RepositoryPendingChange>(
	pendingChange: RepositoryPendingChange | undefined,
	field: Field,
	target: RepositoryPendingChange[Field],
	currentValue: RepositoryPendingChange[Field]
): RepositoryPendingChange | null => {
	const next = { ...pendingChange };

	if (target === currentValue) {
		delete next[field];
	} else {
		next[field] = target;
	}

	return Object.keys(next).length > 0 ? next : null;
};

export const getBulkPendingChange = (
	repository: GitHubRepository,
	pendingChange: RepositoryPendingChange | undefined,
	actions: ManageRepositoryActions,
	watchedRepositories: Set<string>
): RepositoryPendingChange | null => {
	let nextChange = pendingChange;

	if (actions.archiveAction !== "current") {
		nextChange =
			withPendingField(
				nextChange,
				"archived",
				actions.archiveAction === "archived",
				repository.archived
			) ?? undefined;
	}

	if (actions.visibilityAction !== "current") {
		nextChange =
			withPendingField(
				nextChange,
				"visibility",
				actions.visibilityAction,
				repository.visibility
			) ?? undefined;
	}

	if (actions.subscriptionAction !== "current") {
		nextChange =
			withPendingField(
				nextChange,
				"subscription",
				actions.subscriptionAction,
				getRepositorySubscriptionDisplayState(
					repository.name,
					watchedRepositories
				)
			) ?? undefined;
	}

	return nextChange ?? null;
};

export const getManageChangeInputs = (
	pendingChanges: ReadonlyMap<string, RepositoryPendingChange>
): ManageRepositoryChangeInput[] =>
	[...pendingChanges.entries()].map(([repository, change]) => {
		const changeInput: ManageRepositoryChangeInput = { repository };

		if (change.archived !== undefined) {
			changeInput.archiveAction = change.archived ? "archived" : "unarchived";
		}

		if (change.subscription) {
			changeInput.subscriptionAction = change.subscription;
		}

		if (change.visibility) {
			changeInput.visibilityAction = change.visibility;
		}

		return changeInput;
	});

const SUBSCRIPTION_STATE_LABELS = {
	ignoring: "ignoring",
	unwatching: "not watching",
	watching: "watching",
} as const;

export const getPendingChangeLines = (
	repository: GitHubRepository,
	change: RepositoryPendingChange,
	watchedRepositories: Set<string>
): string[] => {
	const lines: string[] = [];

	if (change.archived !== undefined) {
		lines.push(
			`Archived: ${repository.archived ? "yes" : "no"} → ${
				change.archived ? "yes" : "no"
			}`
		);
	}

	if (change.visibility) {
		lines.push(`Visibility: ${repository.visibility} → ${change.visibility}`);
	}

	if (change.subscription) {
		const currentState = getRepositorySubscriptionDisplayState(
			repository.name,
			watchedRepositories
		);

		lines.push(
			`Notifications: ${SUBSCRIPTION_STATE_LABELS[currentState]} → ${
				SUBSCRIPTION_STATE_LABELS[change.subscription]
			}`
		);
	}

	return lines;
};

export const getManageVisibilityStateOptions = (
	supportsInternalVisibility: boolean
): ReadonlyArray<{ label: string; value: RepositoryVisibility }> =>
	MANAGE_VISIBILITY_STATE_OPTIONS.filter(
		(option) => supportsInternalVisibility || option.value !== "internal"
	);

export const getManageVisibilityActionOptions = (
	supportsInternalVisibility: boolean
): ReadonlyArray<{
	label: string;
	value: ManageRepositoryActions["visibilityAction"];
}> =>
	MANAGE_VISIBILITY_ACTION_OPTIONS.filter(
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
