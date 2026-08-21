import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Strong, Text } from "@/components/ui/text";
import { summarizeContributors } from "@/github/contributor-summary";
import type { RepoStats } from "@/github/types";
import { ContributorFacets } from "./contributor-facets";
import { RepoAnalysisSkeleton } from "./repo-analysis-skeleton";
import { RepoOverviewTiles } from "./repo-overview-tiles";
import { ShowBotsField } from "./show-bots-field";
import type { StatsPendingRetry } from "./use-stats-pending-retry";

function PendingState({
	org,
	pendingRetry,
	repo,
}: Readonly<{ org: string; pendingRetry: StatsPendingRetry; repo: string }>) {
	if (pendingRetry.attemptsExhausted) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 py-12">
				<Text className="font-medium text-lg">
					GitHub is still calculating contributor statistics
				</Text>
				<Text className="max-w-md text-center text-sm text-zinc-500">
					{org}/{repo} is taking longer than usual. Try again in a few minutes.
				</Text>
				<Button onClick={pendingRetry.retryNow} outline>
					Try again
				</Button>
			</div>
		);
	}

	return (
		<RepoAnalysisSkeleton org={org} repo={repo} status="github-calculating" />
	);
}

function ErrorState({ error }: Readonly<{ error: string }>) {
	return (
		<div className="flex flex-col items-center justify-center space-y-4 py-12">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
				<svg
					aria-hidden="true"
					className="h-6 w-6 text-red-600 dark:text-red-300"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						d="M6 18L18 6M6 6l12 12"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
					/>
				</svg>
			</div>
			<Text className="font-medium text-lg text-red-600 dark:text-red-400">
				Analysis Failed
			</Text>
			<Text className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
				{error}
			</Text>
		</div>
	);
}

function NoDataState() {
	return (
		<div className="flex flex-col items-center justify-center space-y-4 py-12">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
				<svg
					aria-hidden="true"
					className="h-6 w-6 text-zinc-500"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
					/>
				</svg>
			</div>
			<Text className="font-medium text-lg">No Data Available</Text>
			<Text className="text-sm text-zinc-500">
				Could not retrieve repository statistics.
			</Text>
		</div>
	);
}

export function RepoAnalysisPanel({
	error,
	onShowBotsChange,
	org,
	pendingRetry,
	repo,
	showBots,
	stats,
	statsPending,
	viewerLogin,
}: Readonly<{
	error: string | null;
	onShowBotsChange: (showBots: boolean) => void;
	org: string;
	pendingRetry: StatsPendingRetry;
	repo: string;
	showBots: boolean;
	stats: RepoStats | null;
	statsPending: boolean;
	viewerLogin?: string;
}>) {
	if (statsPending) {
		return <PendingState org={org} pendingRetry={pendingRetry} repo={repo} />;
	}

	if (error) {
		return <ErrorState error={error} />;
	}

	if (!stats) {
		return <NoDataState />;
	}

	const summary = summarizeContributors(stats.contributors, {
		showBots,
		sortBy: "commits",
	});

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Text>
					Statistics cover the <Strong>{stats.defaultBranch}</Strong> branch and
					at most GitHub&apos;s top 100 contributors by commit count.
					{stats.totalFilesTruncated
						? " The file count is partial because GitHub truncated the file tree."
						: null}
				</Text>
				<ShowBotsField onChange={onShowBotsChange} showBots={showBots} />
			</div>
			<Divider className="my-6" />
			<div className="space-y-8">
				<RepoOverviewTiles stats={stats} summary={summary} />
				{summary.rows.length === 0 ? (
					<Text>No contributors to show.</Text>
				) : (
					<ContributorFacets
						contributors={stats.contributors}
						showBots={showBots}
						viewerLogin={viewerLogin}
					/>
				)}
			</div>
		</>
	);
}
