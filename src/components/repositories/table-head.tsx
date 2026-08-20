import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface TableColumn {
	/** Width utility applied to the header cell; omit for the flexible column. */
	className?: string;
	label: string;
}

export const ACTIONS_COLUMN_CLASS_NAME = "w-14";

/** The header row: a select cell (passed in), the data columns, and the actions column. */
export function RepositoryTableHead({
	children,
	columns,
}: Readonly<{
	/** The leading select-column header cell. */
	children: React.ReactNode;
	columns: TableColumn[];
}>) {
	return (
		<TableHead>
			<TableRow>
				{children}
				{columns.map((column) => (
					<TableHeader className={column.className} key={column.label}>
						{column.label}
					</TableHeader>
				))}
				<TableHeader className={ACTIONS_COLUMN_CLASS_NAME}>
					<span className="sr-only">Actions</span>
				</TableHeader>
			</TableRow>
		</TableHead>
	);
}
