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
import { ManageToolbar } from "./manage-toolbar";
import { RepositoriesTable } from "./repositories-table";
import { useManageFlow } from "./use-manage-flow";

/** The loaded repository list for one account: toolbar, table, results, and the edit dialog. */
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

	const { openEditDialog } = flow;
	const editRepository = useCallback(
		(repositoryName: string) => openEditDialog([repositoryName]),
		[openEditDialog]
	);

	const listTopRef = useRef<HTMLDivElement>(null);

	usePageDataErrorToast(pages.error);
	useScrollToPageTop(listTopRef, list.currentPage);

	return (
		<>
			{/* Paging scrolls back here so each page starts at its top. */}
			<div className="scroll-mt-6" ref={listTopRef} />
			<ManageToolbar
				account={account}
				accounts={accounts}
				disabled={flow.isManaging}
				onChangeSearch={list.updateSearch}
				onChangeSort={list.updateSort}
				onPreloadAccount={onPreloadAccount}
				onSelectAccount={onSelectAccount}
				search={list.repositorySearch}
				sort={list.repositorySort}
			/>
			<div className="mb-12 space-y-4">
				<RepositoriesTable
					filteredRepositories={list.paginatedRepositories}
					isManaging={flow.isManaging}
					onEditRepository={editRepository}
					onPreviewChange={flow.previewChange}
					onToggle={list.toggleRepository}
					onToggleAll={list.toggleVisibleRepositories}
					pendingRepositories={flow.pendingRepositories}
					placeholderRowCount={list.placeholderRowCount}
					resultsByRepository={flow.resultsByRepository}
					selectedRepositories={selectedRepositorySet}
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
				onEditSettings={() => flow.openEditDialog(list.selectedRepositories)}
				selectedRepositoryCount={list.selectedRepositories.length}
			/>
			<ManageEditDialog
				account={account}
				actions={flow.actions}
				confirmationValue={flow.confirmationValue}
				isManaging={flow.isManaging}
				onCancel={flow.closeEditDialog}
				onChangeActions={flow.setActions}
				onChangeConfirmationValue={flow.setConfirmationValue}
				onConfirm={flow.runEditDialog}
				open={flow.isEditDialogOpen}
				repositories={flow.editDialogRepositories}
				supportsInternalVisibility={pages.supportsInternalVisibility}
			/>
		</>
	);
}
