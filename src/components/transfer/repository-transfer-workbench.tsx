import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { useMemo } from "react";
import { Input, InputGroup } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type {
	GitHubRepository,
	TransferRepositoryArchiveState,
	TransferRepositoryResult,
	TransferRepositoryVisibility,
} from "@/github";
import { RepositoriesTable } from "./repositories-table";
import { RepositoryPagination } from "./repository-pagination";
import { RepositoryTransferSelect } from "./repository-transfer-select";
import { RepositoryTransferSettingsPanel } from "./repository-transfer-settings-panel";
import { TransferActionBar } from "./transfer-action-bar";
import { TransferResultsPanel } from "./transfer-results-panel";
import { TransferReviewPanel } from "./transfer-review-panel";
import {
	REPOSITORY_SORT_OPTIONS,
	type RepositoriesPerPage,
	type RepositorySort,
} from "./types";
import { getTransferredRepositoryName } from "./utils";

export function RepositoryTransferWorkbench({
	archiveState,
	confirmationValue,
	currentRepositoryPage,
	filteredRepositories,
	from,
	isReviewing,
	isTransferring,
	namePrefix,
	nameSuffix,
	onCancelReview,
	onChangeArchiveState,
	onChangeConfirmationValue,
	onChangeNamePrefix,
	onChangeNameSuffix,
	onChangeRepositoriesPerPage,
	onChangeRepositoryPage,
	onChangeSearch,
	onChangeSort,
	onChangeVisibility,
	onClearResults,
	onConfirmTransfer,
	onRetryFailedTransfers,
	onReviewTransfer,
	onToggleRepository,
	paginatedRepositories,
	pendingRepositories,
	repositories,
	repositoriesPerPage,
	repositoryPageCount,
	repositoryPageEndIndex,
	repositoryPageStartIndex,
	repositorySearch,
	repositorySort,
	selectedRepositories,
	to,
	transferResults,
	visibility,
}: Readonly<{
	archiveState: TransferRepositoryArchiveState;
	confirmationValue: string;
	currentRepositoryPage: number;
	filteredRepositories: GitHubRepository[];
	from: string;
	isReviewing: boolean;
	isTransferring: boolean;
	namePrefix: string;
	nameSuffix: string;
	onCancelReview: () => void;
	onChangeArchiveState: (value: TransferRepositoryArchiveState) => void;
	onChangeConfirmationValue: (value: string) => void;
	onChangeNamePrefix: (value: string) => void;
	onChangeNameSuffix: (value: string) => void;
	onChangeRepositoriesPerPage: (value: RepositoriesPerPage) => void;
	onChangeRepositoryPage: (page: number) => void;
	onChangeSearch: (value: string) => void;
	onChangeSort: (value: RepositorySort) => void;
	onChangeVisibility: (value: TransferRepositoryVisibility) => void;
	onClearResults: () => void;
	onConfirmTransfer: () => void;
	onRetryFailedTransfers: () => void;
	onReviewTransfer: () => void;
	onToggleRepository: (
		repositoryName: string,
		shouldSelectRange?: boolean
	) => void;
	paginatedRepositories: GitHubRepository[];
	pendingRepositories: string[];
	repositories: GitHubRepository[];
	repositoriesPerPage: RepositoriesPerPage;
	repositoryPageCount: number;
	repositoryPageEndIndex: number;
	repositoryPageStartIndex: number;
	repositorySearch: string;
	repositorySort: RepositorySort;
	selectedRepositories: string[];
	to: string;
	transferResults: TransferRepositoryResult[] | null;
	visibility: TransferRepositoryVisibility;
}>) {
	const resultsByRepository = useMemo(
		() =>
			new Map(
				transferResults?.map((result) => [result.repository, result]) ?? []
			),
		[transferResults]
	);
	const pendingRepositorySet = useMemo(
		() => new Set(pendingRepositories),
		[pendingRepositories]
	);
	const selectedRepositorySet = useMemo(
		() => new Set(selectedRepositories),
		[selectedRepositories]
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
	const isRenamingRepositories = namePrefix.length > 0 || nameSuffix.length > 0;
	const hasPostTransferSettings =
		visibility !== "current" || archiveState !== "current";
	const previewRepositoryName =
		filteredRepositories[0]?.name ?? repositories[0]?.name ?? "repository";
	const previewTransferredRepositoryName = getTransferredRepositoryName(
		previewRepositoryName,
		transferOptions
	);

	return (
		<section className="space-y-6">
			<RepositoryTransferSettingsPanel
				archiveState={archiveState}
				hasPostTransferSettings={hasPostTransferSettings}
				isRenamingRepositories={isRenamingRepositories}
				isTransferring={isTransferring}
				namePrefix={namePrefix}
				nameSuffix={nameSuffix}
				onChangeArchiveState={onChangeArchiveState}
				onChangeNamePrefix={onChangeNamePrefix}
				onChangeNameSuffix={onChangeNameSuffix}
				onChangeVisibility={onChangeVisibility}
				previewRepositoryName={previewRepositoryName}
				previewTransferredRepositoryName={previewTransferredRepositoryName}
				visibility={visibility}
			/>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Text>
					Select repositories from <Strong>{from}</Strong> to transfer to{" "}
					<Strong>{to}</Strong>.
				</Text>
				<div className="grid gap-3 sm:min-w-lg sm:grid-cols-[minmax(0,1fr)_12rem]">
					<InputGroup>
						<MagnifyingGlassIcon />
						<Input
							aria-label="Search repositories"
							onChange={(event) => onChangeSearch(event.target.value)}
							placeholder="Search repositories"
							type="search"
							value={repositorySearch}
						/>
					</InputGroup>
					<RepositoryTransferSelect<RepositorySort>
						ariaLabel="Sort repositories"
						className="mt-0"
						disabled={isTransferring}
						onChange={onChangeSort}
						options={REPOSITORY_SORT_OPTIONS}
						value={repositorySort}
					/>
				</div>
			</div>
			<div className="mb-32 space-y-4">
				<RepositoriesTable
					filteredRepositories={paginatedRepositories}
					isTransferring={isTransferring}
					onToggle={onToggleRepository}
					pendingRepositories={pendingRepositorySet}
					resultsByRepository={resultsByRepository}
					selectedRepositories={selectedRepositorySet}
				/>
				<RepositoryPagination
					currentPage={currentRepositoryPage}
					onChangePage={onChangeRepositoryPage}
					onChangePageSize={onChangeRepositoriesPerPage}
					pageCount={repositoryPageCount}
					pageSize={repositoriesPerPage}
					totalRepositoryCount={filteredRepositories.length}
					visibleEndIndex={repositoryPageEndIndex}
					visibleStartIndex={repositoryPageStartIndex}
				/>
			</div>
			{transferResults ? (
				<TransferResultsPanel
					onClearResults={onClearResults}
					onRetryFailedTransfers={onRetryFailedTransfers}
					results={transferResults}
				/>
			) : null}
			{isReviewing ? (
				<TransferReviewPanel
					confirmationValue={confirmationValue}
					from={from}
					isTransferring={isTransferring}
					onCancel={onCancelReview}
					onChangeConfirmationValue={onChangeConfirmationValue}
					onConfirm={onConfirmTransfer}
					repositories={repositories}
					selectedRepositories={selectedRepositories}
					to={to}
					transferOptions={transferOptions}
				/>
			) : (
				<TransferActionBar
					isTransferring={isTransferring}
					onReviewTransfer={onReviewTransfer}
					selectedRepositoryCount={selectedRepositories.length}
				/>
			)}
		</section>
	);
}
