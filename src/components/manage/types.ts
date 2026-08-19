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
		label: "Archive",
		value: "archived",
	},
	{
		label: "Unarchive",
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
		label: "Watch: all activity",
		value: "watching",
	},
	{
		label: "Unwatch: participating and @mentions",
		value: "unwatching",
	},
	{
		label: "Ignore: nothing",
		value: "ignoring",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: ManageRepositorySubscriptionAction;
}>;
