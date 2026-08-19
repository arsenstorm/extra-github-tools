import { createServerFn } from "@tanstack/react-start";
import type {
	GitHubAccount,
	GitHubRepository,
	RepoStats,
	TransferRepositoryArchiveState,
	TransferRepositoryResult,
	TransferRepositoryVisibility,
} from "./github";
import {
	validateFameSearchInput,
	validateTransferRepositoriesInput,
	validateTransferSearchInput,
} from "./server-functions.validation";

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

export const getTransferPageData = createServerFn({ method: "GET" })
	.validator(validateTransferSearchInput)
	.handler(async ({ data }) => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const { resolveTransferPageData } = await import(
			"./server-functions.server"
		);

		return resolveTransferPageData(getRequestHeaders(), data);
	});

export const transferRepositoriesAction = createServerFn({ method: "POST" })
	.validator(validateTransferRepositoriesInput)
	.handler(async ({ data }): Promise<TransferRepositoriesResult> => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const { runTransferRepositoriesAction } = await import(
			"./server-functions.server"
		);

		return runTransferRepositoriesAction(getRequestHeaders(), data);
	});

export const getFamePageData = createServerFn({ method: "GET" })
	.validator(validateFameSearchInput)
	.handler(async ({ data }) => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const { resolveFamePageData } = await import("./server-functions.server");

		return resolveFamePageData(getRequestHeaders(), data);
	});
