import { useEffect, useMemo, useState } from "react";
import PageHeading from "@/components/page-heading";
import type {
	TransferRepositoryArchiveState,
	TransferRepositoryResult,
	TransferRepositoryVisibility,
} from "@/github";
import type {
	TransferPageData,
	TransferRepositoriesResult,
} from "@/server-functions";
import { AccountTransferPanel } from "./account-transfer-panel";
import { RepositoryTransferWorkbench } from "./repository-transfer-workbench";
import { TransferGate } from "./transfer-gate";
import { TransferStartState } from "./transfer-start-state";
import {
	DEFAULT_REPOSITORIES_PER_PAGE,
	type RepositoriesPerPage,
	type RepositorySort,
	type RepositoryTransferOptions,
} from "./types";
import {
	clampRepositoryPage,
	getRepositoryPageCount,
	getSelectedRepositoryNames,
	sortRepositories,
} from "./utils";

export function TransferPageContent({
	from,
	hasGitHubAccess,
	isLoadingTransferData,
	isSignedIn,
	onResetFlow,
	onSelectFrom,
	onSelectTo,
	onTransfer,
	pageData,
	to,
}: Readonly<{
	from?: string;
	hasGitHubAccess: boolean;
	isLoadingTransferData: boolean;
	isSignedIn: boolean;
	onResetFlow: () => void;
	onSelectFrom: (accountHandle: string) => void;
	onSelectTo: (accountHandle: string) => void;
	onTransfer: (
		repositories: string[],
		transferOptions: RepositoryTransferOptions
	) => Promise<TransferRepositoriesResult>;
	pageData: TransferPageData;
	to?: string;
}>) {
	const [archiveState, setArchiveState] =
		useState<TransferRepositoryArchiveState>("current");
	const [confirmationValue, setConfirmationValue] = useState("");
	const [isReviewing, setIsReviewing] = useState(false);
	const [isTransferring, setIsTransferring] = useState(false);
	const [hiddenTransferredRepositories, setHiddenTransferredRepositories] =
		useState<string[]>([]);
	const [namePrefix, setNamePrefix] = useState("");
	const [nameSuffix, setNameSuffix] = useState("");
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);
	const [rangeAnchorRepository, setRangeAnchorRepository] = useState<
		string | null
	>(null);
	const [repositoriesPerPage, setRepositoriesPerPage] =
		useState<RepositoriesPerPage>(DEFAULT_REPOSITORIES_PER_PAGE);
	const [repositoryPage, setRepositoryPage] = useState(1);
	const [repositorySearch, setRepositorySearch] = useState("");
	const [repositorySort, setRepositorySort] =
		useState<RepositorySort>("default");
	const [selectedRepositories, setSelectedRepositories] = useState<string[]>(
		[]
	);
	const [transferResults, setTransferResults] = useState<
		TransferRepositoryResult[] | null
	>(null);
	const [visibility, setVisibility] =
		useState<TransferRepositoryVisibility>("current");
	const sourceRepositories = pageData.repositories ?? [];
	const hiddenTransferredRepositorySet = useMemo(
		() => new Set(hiddenTransferredRepositories),
		[hiddenTransferredRepositories]
	);
	const repositories = useMemo(
		() =>
			sourceRepositories.filter(
				(repository) => !hiddenTransferredRepositorySet.has(repository.name)
			),
		[hiddenTransferredRepositorySet, sourceRepositories]
	);
	const filteredRepositories = useMemo(() => {
		const normalizedSearch = repositorySearch.trim().toLowerCase();

		const matchingRepositories = normalizedSearch
			? repositories.filter((repository) =>
					[repository.name, repository.fullName]
						.join(" ")
						.toLowerCase()
						.includes(normalizedSearch)
				)
			: repositories;

		return sortRepositories(matchingRepositories, repositorySort);
	}, [repositories, repositorySearch, repositorySort]);
	const repositoryPageCount = getRepositoryPageCount(
		filteredRepositories.length,
		repositoriesPerPage
	);
	const currentRepositoryPage = clampRepositoryPage(
		repositoryPage,
		repositoryPageCount
	);
	const repositoryPageStartIndex =
		filteredRepositories.length > 0
			? (currentRepositoryPage - 1) * repositoriesPerPage
			: 0;
	const repositoryPageEndIndex = Math.min(
		repositoryPageStartIndex + repositoriesPerPage,
		filteredRepositories.length
	);
	const paginatedRepositories = useMemo(
		() =>
			filteredRepositories.slice(
				repositoryPageStartIndex,
				repositoryPageEndIndex
			),
		[filteredRepositories, repositoryPageEndIndex, repositoryPageStartIndex]
	);
	const visibleRepositoryNames = useMemo(
		() => paginatedRepositories.map((repository) => repository.name),
		[paginatedRepositories]
	);
	const transferOptions = useMemo(
		() => ({
			archiveState,
			namePrefix,
			nameSuffix,
			visibility,
		}),
		[archiveState, namePrefix, nameSuffix, visibility]
	);
	const selectionResetKey = `${from ?? ""}:${to ?? ""}`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local flow state when the selected accounts change.
	useEffect(() => {
		setArchiveState("current");
		setConfirmationValue("");
		setHiddenTransferredRepositories([]);
		setIsReviewing(false);
		setNamePrefix("");
		setNameSuffix("");
		setPendingRepositories([]);
		setRangeAnchorRepository(null);
		setRepositoryPage(1);
		setRepositorySearch("");
		setRepositorySort("default");
		setSelectedRepositories([]);
		setTransferResults(null);
		setVisibility("current");
	}, [selectionResetKey]);

	useEffect(() => {
		setRepositoryPage((previousPage) =>
			clampRepositoryPage(previousPage, repositoryPageCount)
		);
	}, [repositoryPageCount]);

	const updateRepositorySearch = (value: string): void => {
		setRangeAnchorRepository(null);
		setRepositoryPage(1);
		setRepositorySearch(value);
	};

	const updateRepositoryPage = (page: number): void => {
		setRangeAnchorRepository(null);
		setRepositoryPage(clampRepositoryPage(page, repositoryPageCount));
	};

	const updateRepositoriesPerPage = (
		nextRepositoriesPerPage: RepositoriesPerPage
	): void => {
		setRangeAnchorRepository(null);
		setRepositoriesPerPage(nextRepositoriesPerPage);
		setRepositoryPage(1);
	};

	const updateRepositorySort = (nextRepositorySort: RepositorySort): void => {
		setRangeAnchorRepository(null);
		setRepositoryPage(1);
		setRepositorySort(nextRepositorySort);
	};

	const updateSelectedRepositories = (
		repositoryName: string,
		shouldSelectRange = false
	): void => {
		setTransferResults(null);
		setIsReviewing(false);
		setConfirmationValue("");
		setSelectedRepositories((previousRepositories) => {
			const nextRepositories = new Set(previousRepositories);
			const anchorIndex = rangeAnchorRepository
				? visibleRepositoryNames.indexOf(rangeAnchorRepository)
				: -1;
			const repositoryIndex = visibleRepositoryNames.indexOf(repositoryName);

			if (shouldSelectRange && anchorIndex >= 0 && repositoryIndex >= 0) {
				const rangeStart = Math.min(anchorIndex, repositoryIndex);
				const rangeEnd = Math.max(anchorIndex, repositoryIndex);
				const shouldSelectRepositories = !nextRepositories.has(repositoryName);

				for (const visibleRepositoryName of visibleRepositoryNames.slice(
					rangeStart,
					rangeEnd + 1
				)) {
					if (shouldSelectRepositories) {
						nextRepositories.add(visibleRepositoryName);
					} else {
						nextRepositories.delete(visibleRepositoryName);
					}
				}

				return getSelectedRepositoryNames(nextRepositories, repositories);
			}

			if (nextRepositories.has(repositoryName)) {
				nextRepositories.delete(repositoryName);
			} else {
				nextRepositories.add(repositoryName);
			}

			return getSelectedRepositoryNames(nextRepositories, repositories);
		});
		setRangeAnchorRepository(repositoryName);
	};

	const handleTransfer = async (): Promise<void> => {
		setIsTransferring(true);
		setPendingRepositories(selectedRepositories);

		try {
			const result = await onTransfer(selectedRepositories, transferOptions);

			setTransferResults(result.results);
			setIsReviewing(false);
			setConfirmationValue("");

			if (result.results) {
				const transferredRepositories = result.results
					.filter((transferResult) => transferResult.ok)
					.map((transferResult) => transferResult.repository);
				const failedRepositories = result.results
					.filter((transferResult) => !transferResult.ok)
					.map((transferResult) => transferResult.repository);

				setHiddenTransferredRepositories((previousRepositories) => [
					...new Set([...previousRepositories, ...transferredRepositories]),
				]);
				setSelectedRepositories(
					getSelectedRepositoryNames(failedRepositories, repositories)
				);
				setRangeAnchorRepository(null);
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

		const failedRepositories = transferResults
			.filter((transferResult) => !transferResult.ok)
			.map((transferResult) => transferResult.repository);

		setSelectedRepositories(
			getSelectedRepositoryNames(failedRepositories, repositories)
		);
		setRangeAnchorRepository(null);
		setConfirmationValue("");
		setIsReviewing(true);
	};

	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="Move your repositories in bulk between organizations and personal accounts."
				title="Bulk Transfer Repositories"
			/>
			<TransferGate hasGitHubAccess={hasGitHubAccess} isSignedIn={isSignedIn}>
				<div className="space-y-8">
					<AccountTransferPanel
						accounts={pageData.organizations}
						from={from}
						isLoading={isLoadingTransferData}
						onReset={onResetFlow}
						onSelectFrom={onSelectFrom}
						onSelectTo={onSelectTo}
						to={to}
					/>
					{from && to && from !== to ? (
						<RepositoryTransferWorkbench
							archiveState={archiveState}
							confirmationValue={confirmationValue}
							currentRepositoryPage={currentRepositoryPage}
							filteredRepositories={filteredRepositories}
							from={from}
							isReviewing={isReviewing}
							isTransferring={isTransferring}
							namePrefix={namePrefix}
							nameSuffix={nameSuffix}
							onCancelReview={() => {
								setConfirmationValue("");
								setIsReviewing(false);
							}}
							onChangeArchiveState={setArchiveState}
							onChangeConfirmationValue={setConfirmationValue}
							onChangeNamePrefix={setNamePrefix}
							onChangeNameSuffix={setNameSuffix}
							onChangeRepositoriesPerPage={updateRepositoriesPerPage}
							onChangeRepositoryPage={updateRepositoryPage}
							onChangeSearch={updateRepositorySearch}
							onChangeSort={updateRepositorySort}
							onChangeVisibility={setVisibility}
							onClearResults={() => setTransferResults(null)}
							onConfirmTransfer={handleTransfer}
							onRetryFailedTransfers={retryFailedTransfers}
							onReviewTransfer={() => {
								setTransferResults(null);
								setIsReviewing(true);
							}}
							onToggleRepository={updateSelectedRepositories}
							paginatedRepositories={paginatedRepositories}
							pendingRepositories={pendingRepositories}
							repositories={repositories}
							repositoriesPerPage={repositoriesPerPage}
							repositoryPageCount={repositoryPageCount}
							repositoryPageEndIndex={repositoryPageEndIndex}
							repositoryPageStartIndex={repositoryPageStartIndex}
							repositorySearch={repositorySearch}
							repositorySort={repositorySort}
							selectedRepositories={selectedRepositories}
							to={to}
							transferResults={transferResults}
							visibility={visibility}
						/>
					) : (
						<TransferStartState from={from} to={to} />
					)}
				</div>
			</TransferGate>
		</div>
	);
}
