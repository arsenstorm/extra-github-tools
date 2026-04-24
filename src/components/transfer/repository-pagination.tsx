import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Strong, Text } from "@/components/ui/text";
import {
	REPOSITORIES_PER_PAGE_OPTIONS,
	type RepositoriesPerPage,
} from "./types";

export function RepositoryPagination({
	currentPage,
	onChangePage,
	onChangePageSize,
	pageCount,
	pageSize,
	totalRepositoryCount,
	visibleEndIndex,
	visibleStartIndex,
}: Readonly<{
	currentPage: number;
	onChangePage: (page: number) => void;
	onChangePageSize: (value: RepositoriesPerPage) => void;
	pageCount: number;
	pageSize: RepositoriesPerPage;
	totalRepositoryCount: number;
	visibleEndIndex: number;
	visibleStartIndex: number;
}>) {
	if (totalRepositoryCount === 0) {
		return null;
	}

	const visibleStart = visibleStartIndex + 1;

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<Text>
				Showing <Strong>{visibleStart}</Strong> to{" "}
				<Strong>{visibleEndIndex}</Strong> of{" "}
				<Strong>{totalRepositoryCount}</Strong> repositories.
			</Text>
			<div className="flex items-center gap-4">
				<Button
					disabled={currentPage <= 1}
					onClick={() => onChangePage(currentPage - 1)}
					outline
				>
					<ChevronLeft data-slot="icon" />
					Previous
				</Button>
				<Text>
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
			<label className="flex items-center gap-2 text-sm/6 text-zinc-700 dark:text-zinc-300">
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
