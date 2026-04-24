import { createServerFn } from "@tanstack/react-start";
import {
	type GitHubAccount,
	type GitHubRepository,
	type RepoStats,
	TRANSFER_REPOSITORY_ARCHIVE_STATES,
	TRANSFER_REPOSITORY_VISIBILITIES,
	type TransferRepositoryArchiveState,
	type TransferRepositoryResult,
	type TransferRepositoryVisibility,
} from "./github";

const normalizeOptionalString = (
	value: string | null | undefined
): string | undefined => {
	const trimmedValue = value?.trim();

	return trimmedValue ? trimmedValue : undefined;
};

export interface TransferSearchInput {
	from?: string;
	to?: string;
}

export interface TransferPageData {
	error: string | null;
	organizations: GitHubAccount[] | null;
	repositories: GitHubRepository[] | null;
}

export interface TransferRepositoriesInput {
	archiveState?: TransferRepositoryArchiveState;
	from: string;
	namePrefix?: string;
	nameSuffix?: string;
	repositories: string[];
	to: string;
	visibility?: TransferRepositoryVisibility;
}

export interface TransferRepositoriesResult {
	error: string | null;
	results: TransferRepositoryResult[] | null;
	success: boolean;
}

export interface FameSearchInput {
	org?: string;
	repo?: string;
}

export interface FamePageData {
	error: string | null;
	organizations: GitHubAccount[] | null;
	repositories: GitHubRepository[] | null;
	stats: RepoStats | null;
	statsPending: boolean;
}

const validateTransferSearchInput = (
	data: TransferSearchInput
): TransferSearchInput => ({
	from: normalizeOptionalString(data.from),
	to: normalizeOptionalString(data.to),
});

const validateFameSearchInput = (data: FameSearchInput): FameSearchInput => ({
	org: normalizeOptionalString(data.org),
	repo: normalizeOptionalString(data.repo),
});

const isTransferRepositoryArchiveState = (
	value: unknown
): value is TransferRepositoryArchiveState =>
	typeof value === "string" &&
	TRANSFER_REPOSITORY_ARCHIVE_STATES.includes(
		value as TransferRepositoryArchiveState
	);

const isTransferRepositoryVisibility = (
	value: unknown
): value is TransferRepositoryVisibility =>
	typeof value === "string" &&
	TRANSFER_REPOSITORY_VISIBILITIES.includes(
		value as TransferRepositoryVisibility
	);

const validateTransferRepositoriesInput = (
	data: TransferRepositoriesInput
): TransferRepositoriesInput => ({
	archiveState: isTransferRepositoryArchiveState(data.archiveState)
		? data.archiveState
		: "current",
	from: data.from.trim(),
	namePrefix: data.namePrefix?.trim() ?? "",
	nameSuffix: data.nameSuffix?.trim() ?? "",
	repositories: data.repositories
		.map((repository) => repository.trim())
		.filter((repository) => repository.length > 0),
	to: data.to.trim(),
	visibility: isTransferRepositoryVisibility(data.visibility)
		? data.visibility
		: "current",
});

export const getTransferPageData = createServerFn({ method: "GET" })
	.inputValidator(validateTransferSearchInput)
	.handler(async ({ data }) => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const { resolveTransferPageData } = await import(
			"./server-functions.server"
		);

		return resolveTransferPageData(getRequestHeaders(), data);
	});

export const transferRepositoriesAction = createServerFn({ method: "POST" })
	.inputValidator(validateTransferRepositoriesInput)
	.handler(async ({ data }): Promise<TransferRepositoriesResult> => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const { runTransferRepositoriesAction } = await import(
			"./server-functions.server"
		);

		return runTransferRepositoriesAction(getRequestHeaders(), data);
	});

export const getFamePageData = createServerFn({ method: "GET" })
	.inputValidator(validateFameSearchInput)
	.handler(async ({ data }) => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const { resolveFamePageData } = await import("./server-functions.server");

		return resolveFamePageData(getRequestHeaders(), data);
	});
