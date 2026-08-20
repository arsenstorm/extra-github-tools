import {
	MANAGE_REPOSITORY_ARCHIVE_ACTIONS,
	MANAGE_REPOSITORY_SUBSCRIPTION_ACTIONS,
	MANAGE_REPOSITORY_VISIBILITY_ACTIONS,
	type ManageRepositoryArchiveAction,
	type ManageRepositorySubscriptionAction,
	type ManageRepositoryVisibilityAction,
	TRANSFER_REPOSITORY_ARCHIVE_STATES,
	TRANSFER_REPOSITORY_VISIBILITIES,
	type TransferRepositoryArchiveState,
	type TransferRepositoryVisibility,
} from "./github/types";
import type {
	FameSearchInput,
	GitHubAccountsInput,
	ManageRepositoriesInput,
	ManageRepositoryChangeInput,
	RepositoriesPageInput,
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

const isManageRepositoryArchiveAction = (
	value: unknown
): value is ManageRepositoryArchiveAction =>
	typeof value === "string" &&
	MANAGE_REPOSITORY_ARCHIVE_ACTIONS.includes(
		value as ManageRepositoryArchiveAction
	);

const isManageRepositoryVisibilityAction = (
	value: unknown
): value is ManageRepositoryVisibilityAction =>
	typeof value === "string" &&
	MANAGE_REPOSITORY_VISIBILITY_ACTIONS.includes(
		value as ManageRepositoryVisibilityAction
	);

const isManageRepositorySubscriptionAction = (
	value: unknown
): value is ManageRepositorySubscriptionAction =>
	typeof value === "string" &&
	MANAGE_REPOSITORY_SUBSCRIPTION_ACTIONS.includes(
		value as ManageRepositorySubscriptionAction
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

const toViewer = (value: unknown): GitHubAccountsInput["viewer"] => {
	const viewer =
		toUnknownRecord<NonNullable<GitHubAccountsInput["viewer"]>>(value);
	const login = normalizeOptionalString(viewer.login);
	const avatarUrl = normalizeOptionalString(viewer.avatarUrl);

	if (!(login && avatarUrl && typeof viewer.id === "number")) {
		return;
	}

	return { avatarUrl, id: viewer.id, login };
};

export const validateGitHubAccountsInput = (
	data: GitHubAccountsInput | undefined
): GitHubAccountsInput => {
	const input = toUnknownRecord<GitHubAccountsInput>(data);

	return { viewer: toViewer(input.viewer) };
};

export const validateRepositoriesPageInput = (
	data: RepositoriesPageInput
): RepositoriesPageInput => {
	const input = toUnknownRecord<RepositoriesPageInput>(data);

	return {
		account: toTrimmedString(input.account),
		cursor: normalizeOptionalString(input.cursor),
		viewerLogin: normalizeOptionalString(input.viewerLogin),
	};
};

const toManageRepositoryChanges = (
	value: unknown
): ManageRepositoryChangeInput[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const changes: ManageRepositoryChangeInput[] = [];
	const seenRepositories = new Set<string>();

	for (const item of value) {
		const input = toUnknownRecord<ManageRepositoryChangeInput>(item);
		const repository = toTrimmedString(input.repository);

		if (!repository || seenRepositories.has(repository)) {
			continue;
		}

		const archiveAction = isManageRepositoryArchiveAction(input.archiveAction)
			? input.archiveAction
			: "current";
		const subscriptionAction = isManageRepositorySubscriptionAction(
			input.subscriptionAction
		)
			? input.subscriptionAction
			: "current";
		const visibilityAction = isManageRepositoryVisibilityAction(
			input.visibilityAction
		)
			? input.visibilityAction
			: "current";

		if (
			archiveAction === "current" &&
			subscriptionAction === "current" &&
			visibilityAction === "current"
		) {
			continue;
		}

		seenRepositories.add(repository);
		changes.push({
			archiveAction,
			repository,
			subscriptionAction,
			visibilityAction,
		});
	}

	return changes;
};

export const validateManageRepositoriesInput = (
	data: ManageRepositoriesInput
): ManageRepositoriesInput => {
	const input = toUnknownRecord<ManageRepositoriesInput>(data);

	return {
		account: toTrimmedString(input.account),
		changes: toManageRepositoryChanges(input.changes),
	};
};
