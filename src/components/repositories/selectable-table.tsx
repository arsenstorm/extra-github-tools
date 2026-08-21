import { Table, TableBody } from "@/components/ui/table";
import { EmptyTableRow } from "./empty-table-row";
import { getVisibleSelection, SelectableRowHeader } from "./selectable-row";
import { RepositoryTableHead, type TableColumn } from "./table-head";
import { SkeletonRows } from "./table-skeleton";

/**
 * A fixed-layout repository table with a select-all header, skeleton rows for
 * repositories that are still loading, and an empty state. Children are the
 * loaded rows.
 */
export function SelectableRepositoriesTable({
	children,
	columns,
	disabled,
	onToggleAll,
	placeholderRowCount,
	repositoryNames,
	selectedRepositories,
}: Readonly<{
	children: React.ReactNode;
	columns: TableColumn[];
	disabled: boolean;
	onToggleAll: () => void;
	/** Rows to render as skeletons for repositories that are still loading. */
	placeholderRowCount: number;
	/** Names of the loaded rows, in order. */
	repositoryNames: string[];
	selectedRepositories: Set<string>;
}>) {
	const isEmpty = repositoryNames.length === 0 && placeholderRowCount === 0;
	// The select and actions columns bracket the data columns.
	const columnCount = columns.length + 2;

	return (
		<Table className="-mr-6 md:mx-0" fixed>
			<RepositoryTableHead columns={columns}>
				<SelectableRowHeader
					disabled={disabled || repositoryNames.length === 0}
					onToggleAll={onToggleAll}
					selection={getVisibleSelection(repositoryNames, selectedRepositories)}
				/>
			</RepositoryTableHead>
			<TableBody>
				{children}
				<SkeletonRows columns={columns} count={placeholderRowCount} />
				{isEmpty ? <EmptyTableRow colSpan={columnCount} /> : null}
			</TableBody>
		</Table>
	);
}
