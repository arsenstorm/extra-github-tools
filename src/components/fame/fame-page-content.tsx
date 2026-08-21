import { RepositoryWorkspace } from "@/components/repositories/repository-workspace";
import { ToolWorkspace } from "@/components/tool-page";
import type { GitHubAccount } from "@/github/types";
import type { FamePageData, RepositoriesPage } from "@/server-functions";
import { TOOLS } from "@/tools";
import { FameRepositoriesSection } from "./fame-repositories-section";
import { FameAnalysisToolbar, FameToolbar } from "./fame-toolbar";
import { RepoAnalysisPanel } from "./repo-analysis-panel";
import { RepoAnalysisSkeleton } from "./repo-analysis-skeleton";
import { FAME_TABLE_COLUMNS } from "./repositories-table";
import type { StatsPendingRetry } from "./use-stats-pending-retry";

export function FamePageContent({
	accounts,
	hasGitHubAccess,
	isAnalyzing,
	isLoadingRepositories,
	isSignedIn,
	onClearRepository,
	onLoadPage,
	onPreloadAccount,
	onSelectAccount,
	onSelectRepository,
	onShowBotsChange,
	org,
	pageData,
	pendingRetry,
	repo,
	repositoriesData,
	showBots,
	viewerLogin,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	hasGitHubAccess: boolean;
	/** A navigation to a repository is in flight; its analysis is loading. */
	isAnalyzing: boolean;
	isLoadingRepositories: boolean;
	isSignedIn: boolean;
	onClearRepository: () => void;
	onLoadPage: (cursor: string) => Promise<RepositoriesPage>;
	onPreloadAccount?: (accountHandle: string) => void;
	onSelectAccount: (accountHandle: string) => void;
	onSelectRepository: (repositoryName: string) => void;
	onShowBotsChange: (showBots: boolean) => void;
	org?: string;
	pageData: FamePageData;
	pendingRetry: StatsPendingRetry;
	repo?: string;
	repositoriesData: Promise<RepositoriesPage> | null;
	showBots: boolean;
	viewerLogin?: string;
}>) {
	if (org && repo) {
		return (
			<ToolWorkspace
				hasGitHubAccess={hasGitHubAccess}
				isSignedIn={isSignedIn}
				tool={TOOLS.fame}
			>
				<FameAnalysisToolbar
					accounts={accounts}
					onClearRepository={onClearRepository}
					onPreloadAccount={onPreloadAccount}
					onSelectAccount={onSelectAccount}
					org={org}
				/>
				{isAnalyzing ? (
					<RepoAnalysisSkeleton org={org} repo={repo} status="analyzing" />
				) : (
					<RepoAnalysisPanel
						error={pageData.error}
						onShowBotsChange={onShowBotsChange}
						org={org}
						pendingRetry={pendingRetry}
						repo={repo}
						showBots={showBots}
						stats={pageData.stats}
						statsPending={pageData.statsPending}
						viewerLogin={viewerLogin}
					/>
				)}
			</ToolWorkspace>
		);
	}

	return (
		<ToolWorkspace
			hasGitHubAccess={hasGitHubAccess}
			isSignedIn={isSignedIn}
			tool={TOOLS.fame}
		>
			<RepositoryWorkspace
				columns={FAME_TABLE_COLUMNS}
				isLoading={isLoadingRepositories}
				promise={org ? repositoriesData : null}
				resetKey={org ?? ""}
				selectable={false}
				startMessage="Select an organization to load its repositories."
				toolbar={
					<FameToolbar
						accounts={accounts}
						disabled
						onPreloadAccount={onPreloadAccount}
						onSelectAccount={onSelectAccount}
						org={org}
					/>
				}
			>
				{(data) =>
					org ? (
						<FameRepositoriesSection
							accounts={accounts}
							data={data}
							key={org}
							onLoadPage={onLoadPage}
							onPreloadAccount={onPreloadAccount}
							onSelectAccount={onSelectAccount}
							onSelectRepository={onSelectRepository}
							org={org}
						/>
					) : null
				}
			</RepositoryWorkspace>
		</ToolWorkspace>
	);
}
