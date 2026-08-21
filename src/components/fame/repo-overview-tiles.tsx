import { Text } from "@/components/ui/text";
import { formatCompactNumber } from "@/format";
import type { ContributorSummary } from "@/github/contributor-summary";
import type { RepoStats } from "@/github/types";
import { describeHiddenBots } from "./show-bots-field";

function Tile({
	hint,
	label,
	value,
}: Readonly<{ hint: string; label: string; value: string }>) {
	return (
		<div className="bg-white p-5 dark:bg-zinc-950">
			<Text className="truncate">{label}</Text>
			<p className="mt-1 font-semibold text-3xl text-zinc-950 dark:text-white">
				{value}
			</p>
			<Text className="mt-1 text-sm sm:text-xs">{hint}</Text>
		</div>
	);
}

const describeCommits = (unattributedCommits: number): string =>
	unattributedCommits > 0
		? `+${unattributedCommits.toLocaleString()} unattributed, not counted`
		: "Across shown contributors";

const describeContributors = (hiddenBotCount: number): string =>
	hiddenBotCount > 0 ? describeHiddenBots(hiddenBotCount) : "Shown below";

/** The headline numbers as a row of tiles; hints carry the caveats. */
export function RepoOverviewTiles({
	stats,
	summary,
}: Readonly<{ stats: RepoStats; summary: ContributorSummary }>) {
	const netLines = summary.totalAdditions - summary.totalDeletions;
	const files = `${stats.totalFiles.toLocaleString()}${stats.totalFilesTruncated ? "+" : ""}`;

	return (
		<dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-950/10 bg-zinc-950/10 lg:grid-cols-4 dark:border-white/10 dark:bg-white/10">
			<Tile
				hint={describeCommits(stats.unattributedCommits)}
				label="Commits"
				value={summary.totalCommits.toLocaleString()}
			/>
			<Tile
				hint={describeContributors(summary.hiddenBotCount)}
				label="Contributors"
				value={summary.rows.length.toLocaleString()}
			/>
			<Tile
				hint={`+${formatCompactNumber(summary.totalAdditions)} added · −${formatCompactNumber(summary.totalDeletions)} deleted`}
				label="Net lines"
				value={netLines.toLocaleString()}
			/>
			<Tile
				hint={`On the ${stats.defaultBranch} branch`}
				label="Files"
				value={files}
			/>
		</dl>
	);
}
