import { TableCell, TableRow } from "@/components/ui/table";

export function EmptyTableRow({
	children = "No repositories found.",
	colSpan,
}: Readonly<{
	children?: React.ReactNode;
	colSpan: number;
}>) {
	return (
		<TableRow>
			<TableCell className="text-center" colSpan={colSpan}>
				{children}
			</TableCell>
		</TableRow>
	);
}
