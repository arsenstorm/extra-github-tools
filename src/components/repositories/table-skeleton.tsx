import clsx from "clsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { SELECT_COLUMN_CLASS_NAME } from "./selectable-row";
import { RepositoryTableHead, type TableColumn } from "./table-head";

const SKELETON_ROW_COUNT = 8;
/** Real rows are sized by their 36px dropdown/menu buttons; match that so rows don't jump when data lands. */
const SKELETON_CELL_CLASS_NAME = "flex h-9 items-center";
const SKELETON_BAR_CLASS_NAME =
	"animate-pulse rounded bg-zinc-950/10 dark:bg-white/10";

/** Placeholder rows for repositories that haven't arrived yet. */
export function SkeletonRows({
	columns,
	count,
	keyPrefix = "placeholder",
	selectable = true,
}: Readonly<{
	columns: TableColumn[];
	count: number;
	keyPrefix?: string;
	/** Render the leading select-column cell. */
	selectable?: boolean;
}>) {
	const rowKeys = Array.from(
		{ length: count },
		(_row, index) => `${keyPrefix}-${index}`
	);

	return rowKeys.map((rowKey) => (
		<TableRow key={rowKey}>
			{selectable ? (
				<TableCell className="pr-2! pl-4!">
					<span className={SKELETON_CELL_CLASS_NAME}>
						<span className={clsx("size-4", SKELETON_BAR_CLASS_NAME)} />
					</span>
				</TableCell>
			) : null}
			{columns.map((column) => (
				<TableCell key={column.label}>
					<span className={SKELETON_CELL_CLASS_NAME}>
						<span className={clsx("h-4 w-3/4", SKELETON_BAR_CLASS_NAME)} />
					</span>
				</TableCell>
			))}
			<TableCell>
				<span className={SKELETON_CELL_CLASS_NAME}>
					<span className={clsx("size-4", SKELETON_BAR_CLASS_NAME)} />
				</span>
			</TableCell>
		</TableRow>
	));
}

/** Placeholder rows shown while a repository list loads, matching the real table's columns. */
export function RepositoriesTableSkeleton({
	columns,
	selectable = true,
}: Readonly<{
	columns: TableColumn[];
	/** Render the leading select column. */
	selectable?: boolean;
}>) {
	return (
		<output aria-busy="true" aria-live="polite" className="block">
			<span className="sr-only">Loading repositories…</span>
			<Table className="-mr-6 md:mx-0" fixed>
				<RepositoryTableHead columns={columns}>
					{selectable ? (
						<TableHeader className={SELECT_COLUMN_CLASS_NAME}>
							<span className="sr-only">Select</span>
							<span className={clsx("block size-4", SKELETON_BAR_CLASS_NAME)} />
						</TableHeader>
					) : null}
				</RepositoryTableHead>
				<TableBody>
					<SkeletonRows
						columns={columns}
						count={SKELETON_ROW_COUNT}
						keyPrefix="skeleton"
						selectable={selectable}
					/>
				</TableBody>
			</Table>
		</output>
	);
}
