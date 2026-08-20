import type {
	TransferRepositoryArchiveState,
	TransferRepositoryVisibility,
} from "@/github/types";

export type RepositoryStatus = "failed" | "idle" | "pending" | "transferred";

export interface RepositoryTransferOptions {
	archiveState: TransferRepositoryArchiveState;
	namePrefix: string;
	nameSuffix: string;
	visibility: TransferRepositoryVisibility;
}

export const DEFAULT_TRANSFER_OPTIONS: RepositoryTransferOptions = {
	archiveState: "current",
	namePrefix: "",
	nameSuffix: "",
	visibility: "current",
};

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
