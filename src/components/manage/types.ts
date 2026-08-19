import type {
	ManageRepositoryArchiveAction,
	ManageRepositorySubscriptionAction,
	ManageRepositoryVisibilityAction,
} from "@/github";

export type ManageRepositoryStatus =
	| "failed"
	| "idle"
	| "pending"
	| "unchanged"
	| "updated";

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
