import type {
	TransferRepositoryArchiveState,
	TransferRepositoryVisibility,
} from "@/github";

export type RepositoryStatus = "failed" | "idle" | "pending" | "transferred";
export type RepositorySort = "default" | "pushed-asc" | "pushed-desc";

export interface RepositoryTransferOptions {
	archiveState: TransferRepositoryArchiveState;
	namePrefix: string;
	nameSuffix: string;
	visibility: TransferRepositoryVisibility;
}

export const CONFIRMATION_REQUIRED_REPOSITORY_COUNT = 5;
export const DEFAULT_REPOSITORIES_PER_PAGE = 25;

export const REPOSITORY_VISIBILITY_OPTIONS = [
	{
		label: "Keep current",
		value: "current",
	},
	{
		label: "Private",
		value: "private",
	},
	{
		label: "Public",
		value: "public",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: TransferRepositoryVisibility;
}>;

export const REPOSITORY_ARCHIVE_STATE_OPTIONS = [
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
	value: TransferRepositoryArchiveState;
}>;

export const REPOSITORIES_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export type RepositoriesPerPage =
	(typeof REPOSITORIES_PER_PAGE_OPTIONS)[number];

export const REPOSITORY_SORT_OPTIONS = [
	{
		label: "Default order",
		value: "default",
	},
	{
		label: "Last pushed: newest",
		value: "pushed-desc",
	},
	{
		label: "Last pushed: oldest",
		value: "pushed-asc",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: RepositorySort;
}>;
