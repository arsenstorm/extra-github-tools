import { useMemo, useRef } from "react";
import { RepositoryListPagination } from "@/components/repositories/pagination";
import { useRepositoryPages } from "@/components/repositories/use-repository-pages";
import { useScrollToPageTop } from "@/components/repositories/use-scroll-to-page-top";
import type { GitHubAccount } from "@/github/types";
import { usePageDataErrorToast } from "@/route-utils";
import type {
	RepositoriesPage,
	TransferRepositoriesResult,
} from "@/server-functions";
import { RepositoriesTable } from "./repositories-table";
import { TransferActionBar } from "./transfer-action-bar";
import { TransferConfirmDialog } from "./transfer-confirm-dialog";
import { TransferResultsPanel } from "./transfer-results-panel";
import { TransferToolbar } from "./transfer-toolbar";
import type { RepositoryTransferOptions } from "./types";
import { useTransferFlow } from "./use-transfer-flow";

/** The loaded repository list for one source account: toolbar, table, results, and the review dialog. */
export function TransferRepositoriesSection({
	accounts,
	data,
	from,
	onLoadPage,
	onPreloadSource,
	onSelectFrom,
	onSelectTo,
	onTransfer,
	to,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	/** The first page of repositories; later pages are fetched with `onLoadPage`. */
	data: RepositoriesPage;
	from: string;
	onLoadPage: (cursor: string) => Promise<RepositoriesPage>;
	onPreloadSource: (accountHandle: string) => void;
	onSelectFrom: (accountHandle: string) => void;
	onSelectTo: (accountHandle: string) => void;
	onTransfer: (
		repositories: string[],
		transferOptions: RepositoryTransferOptions
	) => Promise<TransferRepositoriesResult>;
	to: string;
}>) {
	const pages = useRepositoryPages(data, onLoadPage);
	const sourceRepositories = pages.repositories;
	const flow = useTransferFlow({
		expectedRepositoryCount: pages.totalCount,
		onTransfer,
		sourceRepositories,
		to,
	});
	const { list } = flow;
	const selectedRepositorySet = useMemo(
		() => new Set(list.selectedRepositories),
		[list.selectedRepositories]
	);
	const selectedRepositoryRows = useMemo(
		() =>
			flow.repositories.filter((repository) =>
				selectedRepositorySet.has(repository.name)
			),
		[flow.repositories, selectedRepositorySet]
	);

	const listTopRef = useRef<HTMLDivElement>(null);

	usePageDataErrorToast(pages.error);
	useScrollToPageTop(listTopRef, list.currentPage);

	return (
		<>
			{/* Paging scrolls back to the toolbar so each page starts at its top. */}
			<TransferToolbar
				accounts={accounts}
				className="scroll-mt-6"
				disabled={flow.isTransferring}
				from={from}
				onChangeSearch={list.updateSearch}
				onChangeSort={list.updateSort}
				onPreloadSource={onPreloadSource}
				onSelectFrom={onSelectFrom}
				onSelectTo={onSelectTo}
				ref={listTopRef}
				search={list.repositorySearch}
				sort={list.repositorySort}
				to={to}
			/>
			<div className="mb-12 space-y-4">
				<RepositoriesTable
					filteredRepositories={list.paginatedRepositories}
					isTransferring={flow.isTransferring}
					onToggle={flow.toggleRepository}
					onToggleAll={flow.toggleVisibleRepositories}
					pendingRepositories={flow.pendingRepositories}
					placeholderRowCount={list.placeholderRowCount}
					resultsByRepository={flow.resultsByRepository}
					selectedRepositories={selectedRepositorySet}
				/>
				<RepositoryListPagination
					isLoadingMore={pages.isLoadingMore}
					list={list}
				/>
			</div>
			{flow.transferResults ? (
				<TransferResultsPanel
					onClearResults={() => flow.setTransferResults(null)}
					onRetryFailedTransfers={flow.retryFailedTransfers}
					results={flow.transferResults}
				/>
			) : null}
			<TransferActionBar
				isTransferring={flow.isTransferring}
				onReviewTransfer={flow.openReview}
				selectedRepositoryCount={list.selectedRepositories.length}
			/>
			<TransferConfirmDialog
				confirmationValue={flow.confirmationValue}
				from={from}
				isTransferring={flow.isTransferring}
				onCancel={flow.closeReview}
				onChangeConfirmationValue={flow.setConfirmationValue}
				onChangeOptions={flow.setOptions}
				onConfirm={flow.transfer}
				open={flow.isReviewing}
				options={flow.options}
				repositories={selectedRepositoryRows}
				to={to}
			/>
		</>
	);
}
