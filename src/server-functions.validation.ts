import {
	TRANSFER_REPOSITORY_ARCHIVE_STATES,
	TRANSFER_REPOSITORY_VISIBILITIES,
	type TransferRepositoryArchiveState,
	type TransferRepositoryVisibility,
} from "./github";
import type {
	FameSearchInput,
	TransferRepositoriesInput,
	TransferSearchInput,
} from "./server-functions";

type UnknownRecord<Shape> = Partial<Record<keyof Shape, unknown>>;

const toUnknownRecord = <Shape>(value: unknown): UnknownRecord<Shape> =>
	typeof value === "object" && value !== null
		? (value as UnknownRecord<Shape>)
		: {};

const normalizeOptionalString = (value: unknown): string | undefined => {
	if (typeof value !== "string") {
		return;
	}

	const trimmedValue = value.trim();

	return trimmedValue ? trimmedValue : undefined;
};

const toTrimmedString = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

const toRepositoryNames = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const repositoryNames = value
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);

	return [...new Set(repositoryNames)];
};

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

export const validateTransferSearchInput = (
	data: TransferSearchInput
): TransferSearchInput => {
	const input = toUnknownRecord<TransferSearchInput>(data);

	return {
		from: normalizeOptionalString(input.from),
		to: normalizeOptionalString(input.to),
	};
};

export const validateFameSearchInput = (
	data: FameSearchInput
): FameSearchInput => {
	const input = toUnknownRecord<FameSearchInput>(data);

	return {
		org: normalizeOptionalString(input.org),
		repo: normalizeOptionalString(input.repo),
	};
};

export const validateTransferRepositoriesInput = (
	data: TransferRepositoriesInput
): TransferRepositoriesInput => {
	const input = toUnknownRecord<TransferRepositoriesInput>(data);

	return {
		archiveState: isTransferRepositoryArchiveState(input.archiveState)
			? input.archiveState
			: "current",
		from: toTrimmedString(input.from),
		namePrefix: toTrimmedString(input.namePrefix),
		nameSuffix: toTrimmedString(input.nameSuffix),
		repositories: toRepositoryNames(input.repositories),
		to: toTrimmedString(input.to),
		visibility: isTransferRepositoryVisibility(input.visibility)
			? input.visibility
			: "current",
	};
};
