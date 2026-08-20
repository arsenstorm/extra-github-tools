import { toast } from "sonner";
import { formatRepositoryCount } from "@/format";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryResult,
	ManageSettingResult,
	RepositoryVisibility,
} from "@/github/types";
import type { ManageRepositoryChangeInput } from "@/server-functions";
import {
	DEFAULT_MANAGE_ACTIONS,
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

/** The repository fields the app can change, as they stand after a run. */
export type AppliedRepositoryState = Partial<
	Pick<GitHubRepository, "archived" | "subscription" | "visibility">
>;

export type AppliedRepositoryStates = ReadonlyMap<
	string,
	AppliedRepositoryState
>;

/**
 * The new values a successful run gave a repository, so the table can show
 * them before the list is refetched.
 */
export const getAppliedRepositoryState = (
	actions: ManageRepositoryActions,
	result: ManageRepositoryResult
): AppliedRepositoryState | null => {
	const applied: AppliedRepositoryState = {};

	if (
		result.archive?.outcome === "changed" &&
		actions.archiveAction !== "current"
	) {
		applied.archived = actions.archiveAction === "archived";
	}

	if (
		result.visibility?.outcome === "changed" &&
		actions.visibilityAction !== "current"
	) {
		applied.visibility = actions.visibilityAction;
	}

	if (
		result.subscription?.outcome === "changed" &&
		actions.subscriptionAction !== "current"
	) {
		applied.subscription = actions.subscriptionAction;
	}

	return Object.keys(applied).length > 0 ? applied : null;
};

const matchesAppliedState = (
	repository: GitHubRepository,
	applied: AppliedRepositoryState
): boolean =>
	Object.entries(applied).every(
		([key, value]) => repository[key as keyof AppliedRepositoryState] === value
	);

/** Overlays applied states on the loaded list; repositories already up to date keep their identity. */
export const applyRepositoryStates = (
	repositories: GitHubRepository[],
	appliedStates: AppliedRepositoryStates
): GitHubRepository[] => {
	if (appliedStates.size === 0) {
		return repositories;
	}

	return repositories.map((repository) => {
		const applied = appliedStates.get(repository.name);

		return applied && !matchesAppliedState(repository, applied)
			? { ...repository, ...applied }
			: repository;
	});
};

/** Drops applied states the refetched list already reflects. */
export const pruneAppliedStates = (
	repositories: GitHubRepository[],
	appliedStates: AppliedRepositoryStates
): AppliedRepositoryStates => {
	const next = new Map(appliedStates);

	for (const repository of repositories) {
		const applied = next.get(repository.name);

		if (applied && matchesAppliedState(repository, applied)) {
			next.delete(repository.name);
		}
	}

	return next.size === appliedStates.size ? appliedStates : next;
};

export const hasChangedSetting = (result: ManageRepositoryResult): boolean =>
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
	actions: ManageRepositoryActions
): string | null => {
	if (actions.subscriptionAction === "current") {
		return null;
	}

	const targetLabel = SUBSCRIPTION_STATE_LABELS[actions.subscriptionAction];
	const currentState = repository.subscription;

	if (currentState === null) {
		return `Notifications: set to ${targetLabel}`;
	}

	if (actions.subscriptionAction === currentState) {
		return null;
	}

	return `Notifications: ${SUBSCRIPTION_STATE_LABELS[currentState]} → ${targetLabel}`;
};

export const getRepositoryChangeLines = (
	repository: GitHubRepository,
	actions: ManageRepositoryActions
): string[] =>
	[
		getArchiveChangeLine(repository, actions),
		getVisibilityChangeLine(repository, actions),
		getSubscriptionChangeLine(repository, actions),
	].filter((line): line is string => line !== null);

/**
 * GitHub only lets an archived repository be unarchived, so a visibility change
 * unarchives and re-archives it, and GitHub then shows today as the archive date.
 */
export const getArchivedVisibilityWarning = (
	repository: GitHubRepository,
	actions: ManageRepositoryActions
): string | null => {
	const changesVisibility =
		getVisibilityChangeLine(repository, actions) !== null;
	const staysArchived =
		repository.archived && actions.archiveAction !== "unarchived";

	if (!(changesVisibility && staysArchived)) {
		return null;
	}

	return "Changing visibility re-archives this repository, so GitHub will show today as its archive date.";
};

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

export const showManageResultToast = (
	results: ManageRepositoryResult[],
	runError: string | null
): void => {
	const { changedCount, failedCount } = getManageResultCounts(results);

	if (runError) {
		toast.error(
			results.length > 0
				? `${runError} ${formatRepositoryCount(changedCount)} updated before the run stopped.`
				: runError
		);
		return;
	}

	if (failedCount > 0) {
		toast.error(`${formatRepositoryCount(failedCount)} failed to update.`);
		return;
	}

	if (changedCount > 0) {
		toast.success(`${formatRepositoryCount(changedCount)} updated.`);
		return;
	}

	toast.success("No changes were needed.");
};

export const hasManageAction = (actions: ManageRepositoryActions): boolean =>
	Object.values(actions).some((action) => action !== "current");

export const createManageChangeInput = (
	repository: string,
	actions: ManageRepositoryActions
): ManageRepositoryChangeInput => {
	const changeInput: ManageRepositoryChangeInput = { repository };

	if (actions.archiveAction !== "current") {
		changeInput.archiveAction = actions.archiveAction;
	}

	if (actions.subscriptionAction !== "current") {
		changeInput.subscriptionAction = actions.subscriptionAction;
	}

	if (actions.visibilityAction !== "current") {
		changeInput.visibilityAction = actions.visibilityAction;
	}

	return changeInput;
};

/** The repository's current settings expressed as actions, for comparison with staged ones. */
export const getRepositoryStateActions = (
	repository: GitHubRepository
): ManageRepositoryActions => ({
	archiveAction: repository.archived ? "archived" : "unarchived",
	subscriptionAction: repository.subscription ?? "current",
	visibilityAction: repository.visibility,
});

/**
 * Merges a change into a repository's staged actions. Settings that match the
 * repository's current state drop back to "current"; returns null when nothing
 * is left to change.
 */
export const mergeStagedActions = (
	repository: GitHubRepository,
	staged: ManageRepositoryActions | undefined,
	change: Partial<ManageRepositoryActions>
): ManageRepositoryActions | null => {
	const current = getRepositoryStateActions(repository);
	const merged: ManageRepositoryActions = {
		...DEFAULT_MANAGE_ACTIONS,
		...staged,
		...change,
	};
	const next: ManageRepositoryActions = {
		archiveAction:
			merged.archiveAction === current.archiveAction
				? "current"
				: merged.archiveAction,
		subscriptionAction:
			merged.subscriptionAction === current.subscriptionAction
				? "current"
				: merged.subscriptionAction,
		visibilityAction:
			merged.visibilityAction === current.visibilityAction
				? "current"
				: merged.visibilityAction,
	};

	return hasManageAction(next) ? next : null;
};

export type StagedChanges = ReadonlyMap<string, ManageRepositoryActions>;

/** Applies one change to every listed repository; untouched entries keep their identity. */
export const stageChanges = (
	staged: StagedChanges,
	repositories: GitHubRepository[],
	change: Partial<ManageRepositoryActions>
): StagedChanges => {
	const next = new Map(staged);

	for (const repository of repositories) {
		const actions = mergeStagedActions(
			repository,
			staged.get(repository.name),
			change
		);

		if (actions) {
			next.set(repository.name, actions);
		} else {
			next.delete(repository.name);
		}
	}

	return next;
};
