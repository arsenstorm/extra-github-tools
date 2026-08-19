import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { useMemo } from "react";
import {
	REPOSITORY_SORT_OPTIONS,
	type RepositoriesPerPage,
	type RepositorySort,
} from "@/components/repositories/list-types";
import { RepositoryPagination } from "@/components/repositories/pagination";
import { RepositorySelect } from "@/components/repositories/select";
import { Input, InputGroup } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type {
	GitHubRepository,
	TransferRepositoryArchiveState,
	TransferRepositoryResult,
	TransferRepositoryVisibility,
} from "@/github";
import { RepositoriesTable } from "./repositories-table";
import { TransferActionBar } from "./transfer-action-bar";
import { TransferConfirmDialog } from "./transfer-confirm-dialog";
import { TransferResultsPanel } from "./transfer-results-panel";

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

	return (
		<section className="space-y-6">
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
					<RepositorySelect<RepositorySort>
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
			<TransferActionBar
				isTransferring={isTransferring}
				onReviewTransfer={onReviewTransfer}
				selectedRepositoryCount={selectedRepositories.length}
			/>
			<TransferConfirmDialog
				archiveState={archiveState}
				confirmationValue={confirmationValue}
				from={from}
				isTransferring={isTransferring}
				namePrefix={namePrefix}
				nameSuffix={nameSuffix}
				onCancel={onCancelReview}
				onChangeArchiveState={onChangeArchiveState}
				onChangeConfirmationValue={onChangeConfirmationValue}
				onChangeNamePrefix={onChangeNamePrefix}
				onChangeNameSuffix={onChangeNameSuffix}
				onChangeVisibility={onChangeVisibility}
				onConfirm={onConfirmTransfer}
				open={isReviewing}
				repositories={repositories}
				selectedRepositories={selectedRepositories}
				to={to}
				visibility={visibility}
			/>
		</section>
	);
}
