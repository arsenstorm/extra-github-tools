import { useRef } from "react";
import { RepositoryListPagination } from "@/components/repositories/pagination";
import { useRepositoryList } from "@/components/repositories/use-repository-list";
import { useRepositoryPages } from "@/components/repositories/use-repository-pages";
import { useScrollToPageTop } from "@/components/repositories/use-scroll-to-page-top";
import type { GitHubAccount } from "@/github/types";
import { usePageDataErrorToast } from "@/route-utils";
import type { RepositoriesPage } from "@/server-functions";
import { FameToolbar } from "./fame-toolbar";
import { RepositoriesTable } from "./repositories-table";

/** The loaded repository list for one account: toolbar, table, and pagination. */
export function FameRepositoriesSection({
	accounts,
	data,
	onLoadPage,
	onPreloadAccount,
	onSelectAccount,
	onSelectRepository,
	org,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	/** The first page of repositories; later pages are fetched with `onLoadPage`. */
	data: RepositoriesPage;
	onLoadPage: (cursor: string) => Promise<RepositoriesPage>;
	onPreloadAccount?: (accountHandle: string) => void;
	onSelectAccount: (accountHandle: string) => void;
	onSelectRepository: (repositoryName: string) => void;
	org: string;
}>) {
	const pages = useRepositoryPages(data, onLoadPage);
	const list = useRepositoryList(pages.repositories, {
		expectedCount: pages.totalCount,
	});
	const listTopRef = useRef<HTMLDivElement>(null);

	usePageDataErrorToast(pages.error);
	useScrollToPageTop(listTopRef, list.currentPage);

	return (
		<>
			{/* Paging scrolls back to the toolbar so each page starts at its top. */}
			<FameToolbar
				accounts={accounts}
				className="scroll-mt-6"
				disabled={false}
				onChangeSearch={list.updateSearch}
				onChangeSort={list.updateSort}
				onPreloadAccount={onPreloadAccount}
				onSelectAccount={onSelectAccount}
				org={org}
				ref={listTopRef}
				search={list.repositorySearch}
				sort={list.repositorySort}
			/>
			<div className="space-y-4">
				<RepositoriesTable
					filteredRepositories={list.paginatedRepositories}
					onSelect={onSelectRepository}
					placeholderRowCount={list.placeholderRowCount}
				/>
				<RepositoryListPagination
					isLoadingMore={pages.isLoadingMore}
					list={list}
				/>
			</div>
		</>
	);
}
