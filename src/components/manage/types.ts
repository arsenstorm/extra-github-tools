import type {
	ManageRepositoryActions,
	ManageRepositoryArchiveAction,
	ManageRepositorySubscriptionAction,
	ManageRepositoryVisibilityAction,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "@/github/types";

export type ManageRepositoryArchiveState = Exclude<
	ManageRepositoryArchiveAction,
	"current"
>;

export type ManageRepositoryStatus =
	| "failed"
	| "idle"
	| "pending"
	| "staged"
	| "unchanged"
	| "updated";

export const DEFAULT_MANAGE_ACTIONS: ManageRepositoryActions = {
	archiveAction: "current",
	subscriptionAction: "current",
	visibilityAction: "current",
};

export const MANAGE_ARCHIVE_ACTION_OPTIONS = [
	{
		label: "Keep current",
		value: "current",
	},
	{
		label: "Archived",
		value: "archived",
	},
	{
		label: "Active",
		value: "unarchived",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: ManageRepositoryArchiveAction;
}>;

export const MANAGE_VISIBILITY_ACTION_OPTIONS = [
	{
		label: "Keep current",
		value: "current",
	},
	{
		label: "Public",
		value: "public",
	},
	{
		label: "Private",
		value: "private",
	},
	{
		label: "Internal",
		value: "internal",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: ManageRepositoryVisibilityAction;
}>;

export const MANAGE_SUBSCRIPTION_ACTION_OPTIONS = [
	{
		label: "Keep current",
		value: "current",
	},
	{
		label: "Watching",
		value: "watching",
	},
	{
		label: "Not watching",
		value: "unwatching",
	},
	{
		label: "Ignoring",
		value: "ignoring",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: ManageRepositorySubscriptionAction;
}>;

export const MANAGE_ARCHIVE_TARGET_OPTIONS = [
	{
		label: "Active",
		value: "unarchived",
	},
	{
		label: "Archived",
		value: "archived",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: ManageRepositoryArchiveState;
}>;

export const MANAGE_VISIBILITY_TARGET_OPTIONS = [
	{
		label: "Public",
		value: "public",
	},
	{
		label: "Private",
		value: "private",
	},
	{
		label: "Internal",
		value: "internal",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: RepositoryVisibility;
}>;

export const MANAGE_SUBSCRIPTION_TARGET_OPTIONS = [
	{
		label: "Watching",
		value: "watching",
	},
	{
		label: "Not watching",
		value: "unwatching",
	},
	{
		label: "Ignoring",
		value: "ignoring",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: RepositorySubscriptionState;
}>;
