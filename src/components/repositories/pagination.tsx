import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Strong, Text } from "@/components/ui/text";
import { pluralize } from "@/format";
import {
	REPOSITORIES_PER_PAGE_OPTIONS,
	type RepositoriesPerPage,
} from "./list-types";
import type { RepositoryListState } from "./use-repository-list";

/** Pagination wired straight to a `useRepositoryList` state. */
export function RepositoryListPagination({
	isLoadingMore = false,
	list,
}: Readonly<{
	/** More repositories are still arriving; the totals below are partial. */
	isLoadingMore?: boolean;
	list: RepositoryListState;
}>) {
	return (
		<RepositoryPagination
			currentPage={list.currentPage}
			isLoadingMore={isLoadingMore}
			onChangePage={list.updatePage}
			onChangePageSize={list.updateRepositoriesPerPage}
			pageCount={list.pageCount}
			pageSize={list.repositoriesPerPage}
			totalRepositoryCount={list.totalCount}
			visibleEndIndex={list.pageEndIndex}
			visibleStartIndex={list.pageStartIndex}
		/>
	);
}

export function RepositoryPagination({
	currentPage,
	isLoadingMore = false,
	onChangePage,
	onChangePageSize,
	pageCount,
	pageSize,
	totalRepositoryCount,
	visibleEndIndex,
	visibleStartIndex,
}: Readonly<{
	currentPage: number;
	isLoadingMore?: boolean;
	onChangePage: (page: number) => void;
	onChangePageSize: (value: RepositoriesPerPage) => void;
	pageCount: number;
	pageSize: RepositoriesPerPage;
	totalRepositoryCount: number;
	visibleEndIndex: number;
	visibleStartIndex: number;
}>) {
	const loadingMore = isLoadingMore ? (
		<Text className="animate-pulse">Loading repositories…</Text>
	) : null;

	if (totalRepositoryCount === 0) {
		return loadingMore;
	}

	if (totalRepositoryCount <= REPOSITORIES_PER_PAGE_OPTIONS[0]) {
		return (
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Text className="tabular-nums">
					<Strong>{totalRepositoryCount}</Strong>{" "}
					{pluralize(totalRepositoryCount, "repository", "repositories")}.
				</Text>
				{loadingMore}
			</div>
		);
	}

	const visibleStart = visibleStartIndex + 1;

	// A 1fr | auto | 1fr grid keeps the page controls centred no matter how
	// wide the summary or the rows-per-page picker is, and tabular digits keep
	// the numbers from nudging their neighbours as they change.
	return (
		<div className="grid grid-cols-1 items-center gap-3 tabular-nums sm:grid-cols-[1fr_auto_1fr]">
			<Text>
				Showing <Strong>{visibleStart}</Strong> to{" "}
				<Strong>{visibleEndIndex}</Strong> of{" "}
				<Strong>{totalRepositoryCount}</Strong> repositories.
			</Text>
			<div className="flex items-center gap-4 justify-self-center">
				<Button
					disabled={currentPage <= 1}
					onClick={() => onChangePage(currentPage - 1)}
					outline
				>
					<ChevronLeft data-slot="icon" />
					Previous
				</Button>
				<Text className="min-w-[12ch] text-center">
					Page <Strong>{currentPage}</Strong> of <Strong>{pageCount}</Strong>
				</Text>
				<Button
					disabled={currentPage >= pageCount}
					onClick={() => onChangePage(currentPage + 1)}
					outline
				>
					Next
					<ChevronRight data-slot="icon" />
				</Button>
			</div>
			<label className="flex items-center gap-2 text-sm/6 text-zinc-700 sm:justify-self-end dark:text-zinc-300">
				<span>Rows per page</span>
				<select
					className="dark:scheme-dark rounded-lg border border-zinc-950/10 bg-transparent py-1.5 pr-8 pl-2 text-zinc-950 focus:outline-2 focus:outline-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
					onChange={(event) =>
						onChangePageSize(Number(event.target.value) as RepositoriesPerPage)
					}
					value={pageSize}
				>
					{REPOSITORIES_PER_PAGE_OPTIONS.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</label>
		</div>
	);
}
