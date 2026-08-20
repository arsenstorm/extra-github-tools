import { ResultsPanel } from "@/components/repositories/results-panel";
import { Strong } from "@/components/ui/text";
import type { ManageRepositoryResult } from "@/github/types";
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
		<ResultsPanel
			canRetry={failedCount > 0}
			onClearResults={onClearResults}
			onRetryFailed={onRetryFailed}
			rows={results.map((result) => ({
				details: getManageResultDetails(result),
				key: result.repository,
				label: getManageResultLabel(result),
				ok: result.ok,
				repository: <Strong>{result.repository}</Strong>,
			}))}
			summary={`${results.length} requested, ${changedCount} updated, ${unchangedCount} no change needed, ${failedCount} failed.`}
			title="Update results"
		/>
	);
}
