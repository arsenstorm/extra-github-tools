import { CheckCircle2, CircleAlert, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Strong, Text } from "@/components/ui/text";

export interface ResultRow {
	details: string;
	key: string;
	label: string;
	ok: boolean;
	repository: React.ReactNode;
}

export function ResultsPanel({
	canRetry,
	onClearResults,
	onRetryFailed,
	rows,
	summary,
	title,
}: Readonly<{
	canRetry: boolean;
	onClearResults: () => void;
	onRetryFailed: () => void;
	rows: ResultRow[];
	summary: string;
	title: string;
}>) {
	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Strong>{title}</Strong>
					<Text className="mt-1">{summary}</Text>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button disabled={!canRetry} onClick={onRetryFailed} outline>
						<RefreshCcw data-slot="icon" />
						Retry failed
					</Button>
					<Button onClick={onClearResults} outline>
						Clear results
					</Button>
				</div>
			</div>
			<Divider className="my-4" />
			<Table dense>
				<TableHead>
					<TableRow>
						<TableHeader>Repository</TableHeader>
						<TableHeader>Result</TableHeader>
						<TableHeader>Details</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.key}>
							<TableCell>{row.repository}</TableCell>
							<TableCell>
								<span className="inline-flex items-center gap-2">
									{row.ok ? (
										<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
									) : (
										<CircleAlert className="size-4 text-red-600 dark:text-red-400" />
									)}
									{row.label}
								</span>
							</TableCell>
							<TableCell>
								<Text>{row.details}</Text>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}
