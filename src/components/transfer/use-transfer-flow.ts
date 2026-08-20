import { useCallback, useEffect, useMemo, useState } from "react";
import { getSelectedRepositoryNames } from "@/components/repositories/list-utils";
import {
	type RepositoryListState,
	useRepositoryList,
} from "@/components/repositories/use-repository-list";
import type {
	GitHubRepository,
	TransferRepositoryResult,
} from "@/github/types";
import type { TransferRepositoriesResult } from "@/server-functions";
import {
	DEFAULT_TRANSFER_OPTIONS,
	type RepositoryTransferOptions,
} from "./types";

const getRepositoryNames = (
	results: TransferRepositoryResult[],
	ok: boolean
): string[] =>
	results
		.filter((result) => result.ok === ok)
		.map((result) => result.repository);

export interface TransferFlow {
	closeReview: () => void;
	confirmationValue: string;
	isReviewing: boolean;
	isTransferring: boolean;
	list: RepositoryListState;
	openReview: () => void;
	options: RepositoryTransferOptions;
	pendingRepositories: Set<string>;
	repositories: GitHubRepository[];
	resultsByRepository: Map<string, TransferRepositoryResult>;
	retryFailedTransfers: () => void;
	setConfirmationValue: (value: string) => void;
	setOptions: (options: RepositoryTransferOptions) => void;
	setTransferResults: (results: TransferRepositoryResult[] | null) => void;
	toggleRepository: (
		repositoryName: string,
		shouldSelectRange?: boolean
	) => void;
	toggleVisibleRepositories: () => void;
	transfer: () => Promise<void>;
	transferResults: TransferRepositoryResult[] | null;
}

export function useTransferFlow({
	expectedRepositoryCount,
	onTransfer,
	sourceRepositories,
	to,
}: Readonly<{
	expectedRepositoryCount: number;
	onTransfer: (
		repositories: string[],
		transferOptions: RepositoryTransferOptions
	) => Promise<TransferRepositoriesResult>;
	sourceRepositories: GitHubRepository[];
	to?: string;
}>): TransferFlow {
	const [options, setOptions] = useState<RepositoryTransferOptions>(
		DEFAULT_TRANSFER_OPTIONS
	);
	const [confirmationValue, setConfirmationValue] = useState("");
	const [isReviewing, setIsReviewing] = useState(false);
	const [isTransferring, setIsTransferring] = useState(false);
	const [hiddenTransferredRepositories, setHiddenTransferredRepositories] =
		useState<string[]>([]);
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);
	const [transferResults, setTransferResults] = useState<
		TransferRepositoryResult[] | null
	>(null);

	const repositories = useMemo(() => {
		const hiddenRepositorySet = new Set(hiddenTransferredRepositories);

		return sourceRepositories.filter(
			(repository) => !hiddenRepositorySet.has(repository.name)
		);
	}, [hiddenTransferredRepositories, sourceRepositories]);
	const list = useRepositoryList(repositories, {
		expectedCount: expectedRepositoryCount,
	});
	const pendingRepositorySet = useMemo(
		() => new Set(pendingRepositories),
		[pendingRepositories]
	);
	const resultsByRepository = useMemo(
		() =>
			new Map(
				transferResults?.map((result) => [result.repository, result]) ?? []
			),
		[transferResults]
	);
	const closeReview = useCallback((): void => {
		setConfirmationValue("");
		setIsReviewing(false);
	}, []);

	// Any selection change invalidates the previous results and review.
	const discardReview = useCallback((): void => {
		setTransferResults(null);
		closeReview();
	}, [closeReview]);

	const { toggleRepository: toggleListRepository } = list;
	const toggleRepository = useCallback(
		(repositoryName: string, shouldSelectRange?: boolean): void => {
			discardReview();
			toggleListRepository(repositoryName, shouldSelectRange);
		},
		[discardReview, toggleListRepository]
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: the destination only affects the review, so the selection is kept.
	useEffect(() => {
		discardReview();
	}, [to]);

	const transfer = async (): Promise<void> => {
		const { selectedRepositories } = list;

		setIsTransferring(true);
		setPendingRepositories(selectedRepositories);

		try {
			const result = await onTransfer(selectedRepositories, options);

			setTransferResults(result.results);
			closeReview();

			if (result.results) {
				const transferredRepositories = getRepositoryNames(
					result.results,
					true
				);

				setHiddenTransferredRepositories((previousRepositories) => [
					...new Set([...previousRepositories, ...transferredRepositories]),
				]);
				list.setSelectedRepositories(
					getSelectedRepositoryNames(
						getRepositoryNames(result.results, false),
						repositories
					)
				);
			}
		} finally {
			setPendingRepositories([]);
			setIsTransferring(false);
		}
	};

	const retryFailedTransfers = (): void => {
		if (!transferResults) {
			return;
		}

		list.setSelectedRepositories(getRepositoryNames(transferResults, false));
		setConfirmationValue("");
		setIsReviewing(true);
	};

	return {
		closeReview,
		confirmationValue,
		isReviewing,
		isTransferring,
		list,
		openReview: () => {
			setTransferResults(null);
			setIsReviewing(true);
		},
		options,
		pendingRepositories: pendingRepositorySet,
		repositories,
		resultsByRepository,
		retryFailedTransfers,
		setConfirmationValue,
		setOptions,
		setTransferResults,
		toggleRepository,
		toggleVisibleRepositories: () => {
			discardReview();
			list.toggleVisibleRepositories();
		},
		transfer,
		transferResults,
	};
}
