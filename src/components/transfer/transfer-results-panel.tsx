import { ResultsPanel } from "@/components/repositories/results-panel";
import { Strong, Text } from "@/components/ui/text";
import { formatCount } from "@/format";
import type { TransferRepositoryResult } from "@/github/types";
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
	const settingsSummary =
		settingsFailedCount > 0
			? `, ${formatCount(settingsFailedCount, "settings update", "settings updates")} failed`
			: "";

	return (
		<ResultsPanel
			canRetry={failedCount > 0}
			onClearResults={onClearResults}
			onRetryFailed={onRetryFailedTransfers}
			rows={results.map((result) => ({
				details: getTransferResultDetails(result),
				key: result.repository,
				label: getTransferResultLabel(result),
				ok: isTransferResultComplete(result),
				repository: (
					<div>
						<Strong>{result.repository}</Strong>
						{result.newName === result.repository ? null : (
							<Text className="mt-1">Transferred as {result.newName}</Text>
						)}
					</div>
				),
			}))}
			summary={`${results.length} requested, ${transferredCount} transferred, ${failedCount} failed${settingsSummary}.`}
			title="Transfer results"
		/>
	);
}
