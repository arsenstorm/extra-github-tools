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
import type { TransferRepositoryResult } from "@/github";
import {
	getPostTransferSettingsFailureCount,
	getTransferResultDetails,
	getTransferResultLabel,
	isTransferResultComplete,
} from "./utils";

export function TransferResultsPanel({
	onClearResults,
	onRetryFailedTransfers,
	results,
}: Readonly<{
	onClearResults: () => void;
	onRetryFailedTransfers: () => void;
	results: TransferRepositoryResult[];
}>) {
	const transferredCount = results.filter((result) => result.ok).length;
	const failedCount = results.length - transferredCount;
	const settingsFailedCount = getPostTransferSettingsFailureCount(results);

	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Strong>Transfer results</Strong>
					<Text className="mt-1">
						{results.length} requested, {transferredCount} transferred,{" "}
						{failedCount} failed
						{settingsFailedCount > 0
							? `, ${settingsFailedCount} ${
									settingsFailedCount === 1
										? "settings update"
										: "settings updates"
								} failed`
							: ""}
						.
					</Text>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={failedCount === 0}
						onClick={onRetryFailedTransfers}
						outline
					>
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
								<div>
									<Strong>{result.repository}</Strong>
									{result.newName === result.repository ? null : (
										<Text className="mt-1">
											Transferred as {result.newName}
										</Text>
									)}
								</div>
							</TableCell>
							<TableCell>
								<span className="inline-flex items-center gap-2">
									{isTransferResultComplete(result) ? (
										<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
									) : (
										<CircleAlert className="size-4 text-red-600 dark:text-red-400" />
									)}
									{getTransferResultLabel(result)}
								</span>
							</TableCell>
							<TableCell>
								<Text>{getTransferResultDetails(result)}</Text>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}
