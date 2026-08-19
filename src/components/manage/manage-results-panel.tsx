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
import type { ManageRepositoryResult } from "@/github";
import {
	getManageResultCounts,
	getManageResultDetails,
	getManageResultLabel,
} from "./utils";

export function ManageResultsPanel({
	onClearResults,
	onRetryFailed,
	results,
}: Readonly<{
	onClearResults: () => void;
	onRetryFailed: () => void;
	results: ManageRepositoryResult[];
}>) {
	const { changedCount, failedCount, unchangedCount } =
		getManageResultCounts(results);

	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Strong>Update results</Strong>
					<Text className="mt-1">
						{results.length} requested, {changedCount} updated, {unchangedCount}{" "}
						no change needed, {failedCount} failed.
					</Text>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button disabled={failedCount === 0} onClick={onRetryFailed} outline>
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
					{results.map((result) => (
						<TableRow key={result.repository}>
							<TableCell>
								<Strong>{result.repository}</Strong>
							</TableCell>
							<TableCell>
								<span className="inline-flex items-center gap-2">
									{result.ok ? (
										<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
									) : (
										<CircleAlert className="size-4 text-red-600 dark:text-red-400" />
									)}
									{getManageResultLabel(result)}
								</span>
							</TableCell>
							<TableCell>
								<Text>{getManageResultDetails(result)}</Text>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}
