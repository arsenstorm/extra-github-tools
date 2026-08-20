import { useCallback, useMemo, useRef } from "react";
import { RepositoryListPagination } from "@/components/repositories/pagination";
import { useRepositoryPages } from "@/components/repositories/use-repository-pages";
import { useScrollToPageTop } from "@/components/repositories/use-scroll-to-page-top";
import type { GitHubAccount } from "@/github/types";
import { usePageDataErrorToast } from "@/route-utils";
import type {
	ManageRepositoriesResult,
	ManageRepositoryChangeInput,
	RepositoriesPage,
} from "@/server-functions";
import { ManageActionBar } from "./manage-action-bar";
import { ManageEditDialog } from "./manage-edit-dialog";
import { ManageResultsPanel } from "./manage-results-panel";
import { ManageReviewDialog } from "./manage-review-dialog";
import { ManageToolbar } from "./manage-toolbar";
import { RepositoriesTable } from "./repositories-table";
import { useManageFlow } from "./use-manage-flow";

/** The loaded repository list for one account: toolbar, table, results, and the edit and review dialogs. */
export function ManageRepositoriesSection({
	account,
	accounts,
	data,
	onLoadPage,
	onManageChunk,
	onPreloadAccount,
	onRunComplete,
	onSelectAccount,
}: Readonly<{
	account: string;
	accounts: GitHubAccount[] | null;
	/** The first page of repositories; later pages are fetched with `onLoadPage`. */
	data: RepositoriesPage;
	onLoadPage: (cursor: string) => Promise<RepositoriesPage>;
	onManageChunk: (
		changes: ManageRepositoryChangeInput[]
	) => Promise<ManageRepositoriesResult>;
	onPreloadAccount: (accountHandle: string) => void;
	onRunComplete: (didChangeAnything: boolean) => Promise<void>;
	onSelectAccount: (accountHandle: string) => void;
}>) {
	const pages = useRepositoryPages(data, onLoadPage);
	const { repositories } = pages;
	const flow = useManageFlow({
		expectedRepositoryCount: pages.totalCount,
		onManageChunk,
		onRunComplete,
		repositories,
	});
	const { list } = flow;
	const selectedRepositorySet = useMemo(
		() => new Set(list.selectedRepositories),
		[list.selectedRepositories]
	);

	const { openBulkEdit } = flow;
	const editRepository = useCallback(
		(repositoryName: string) => openBulkEdit([repositoryName]),
		[openBulkEdit]
	);

	const listTopRef = useRef<HTMLDivElement>(null);

	usePageDataErrorToast(pages.error);
	useScrollToPageTop(listTopRef, list.currentPage);

	return (
		<>
			{/* Paging scrolls back to the toolbar so each page starts at its top. */}
			<ManageToolbar
				account={account}
				accounts={accounts}
				className="scroll-mt-6"
				disabled={flow.isManaging}
				onChangeSearch={list.updateSearch}
				onChangeSort={list.updateSort}
				onPreloadAccount={onPreloadAccount}
				onSelectAccount={onSelectAccount}
				ref={listTopRef}
				search={list.repositorySearch}
				sort={list.repositorySort}
			/>
			<div className="mb-12 space-y-4">
				<RepositoriesTable
					filteredRepositories={list.paginatedRepositories}
					isManaging={flow.isManaging}
					onEditRepository={editRepository}
					onStageChange={flow.stageChange}
					onToggle={list.toggleRepository}
					onToggleAll={list.toggleVisibleRepositories}
					pendingRepositories={flow.pendingRepositories}
					placeholderRowCount={list.placeholderRowCount}
					resultsByRepository={flow.resultsByRepository}
					selectedRepositories={selectedRepositorySet}
					stagedChanges={flow.stagedChanges}
					supportsInternalVisibility={pages.supportsInternalVisibility}
				/>
				<RepositoryListPagination
					isLoadingMore={pages.isLoadingMore}
					list={list}
				/>
			</div>
			{flow.manageResults ? (
				<ManageResultsPanel
					onClearResults={() => flow.setManageResults(null)}
					onRetryFailed={flow.retryFailedRepositories}
					results={flow.manageResults}
				/>
			) : null}
			<ManageActionBar
				isManaging={flow.isManaging}
				managingRepositoryCount={flow.managingRepositoryCount}
				onClearSelection={() => list.setSelectedRepositories([])}
				onDiscardChanges={flow.discardChanges}
				onEditSettings={() => flow.openBulkEdit(list.selectedRepositories)}
				onReviewChanges={flow.openReview}
				selectedRepositoryCount={list.selectedRepositories.length}
				stagedRepositoryCount={flow.stagedRepositories.length}
			/>
			<ManageEditDialog
				account={account}
				actions={flow.bulkActions}
				onCancel={flow.closeBulkEdit}
				onChangeActions={flow.setBulkActions}
				onConfirm={flow.stageBulkEdit}
				open={flow.isBulkEditOpen}
				repositories={flow.bulkEditRepositories}
				supportsInternalVisibility={pages.supportsInternalVisibility}
			/>
			<ManageReviewDialog
				account={account}
				confirmationValue={flow.confirmationValue}
				isManaging={flow.isManaging}
				onCancel={flow.closeReview}
				onChangeConfirmationValue={flow.setConfirmationValue}
				onConfirm={flow.runStagedChanges}
				onUnstageRepository={flow.unstageRepository}
				open={flow.isReviewing}
				repositories={flow.stagedRepositories}
				stagedChanges={flow.stagedChanges}
			/>
		</>
	);
}
