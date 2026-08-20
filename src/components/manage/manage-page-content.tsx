import { RepositoryWorkspace } from "@/components/repositories/repository-workspace";
import { ToolWorkspace } from "@/components/tool-page";
import type { GitHubAccount } from "@/github/types";
import type {
	ManageRepositoriesResult,
	ManageRepositoryChangeInput,
	RepositoriesPage,
} from "@/server-functions";
import { TOOLS } from "@/tools";
import { ManageRepositoriesSection } from "./manage-repositories-section";
import { ManageToolbar } from "./manage-toolbar";
import { MANAGE_TABLE_COLUMNS } from "./repositories-table";

export function ManagePageContent({
	account,
	accounts,
	hasGitHubAccess,
	isLoadingRepositories,
	isSignedIn,
	onLoadPage,
	onManageChunk,
	onPreloadAccount,
	onRunComplete,
	onSelectAccount,
	repositoriesData,
}: Readonly<{
	account?: string;
	accounts: GitHubAccount[] | null;
	hasGitHubAccess: boolean;
	isLoadingRepositories: boolean;
	isSignedIn: boolean;
	onLoadPage: (cursor: string) => Promise<RepositoriesPage>;
	onManageChunk: (
		changes: ManageRepositoryChangeInput[]
	) => Promise<ManageRepositoriesResult>;
	onPreloadAccount: (accountHandle: string) => void;
	onRunComplete: (didChangeAnything: boolean) => Promise<void>;
	onSelectAccount: (accountHandle: string) => void;
	repositoriesData: Promise<RepositoriesPage> | null;
}>) {
	return (
		<ToolWorkspace
			hasGitHubAccess={hasGitHubAccess}
			isSignedIn={isSignedIn}
			tool={TOOLS.manage}
		>
			<RepositoryWorkspace
				columns={MANAGE_TABLE_COLUMNS}
				isLoading={isLoadingRepositories}
				promise={account ? repositoriesData : null}
				resetKey={account ?? ""}
				startMessage="Select an organization to load its repositories."
				toolbar={
					<ManageToolbar
						account={account}
						accounts={accounts}
						disabled
						onPreloadAccount={onPreloadAccount}
						onSelectAccount={onSelectAccount}
					/>
				}
			>
				{(data) =>
					account ? (
						<ManageRepositoriesSection
							account={account}
							accounts={accounts}
							data={data}
							key={account}
							onLoadPage={onLoadPage}
							onManageChunk={onManageChunk}
							onPreloadAccount={onPreloadAccount}
							onRunComplete={onRunComplete}
							onSelectAccount={onSelectAccount}
						/>
					) : null
				}
			</RepositoryWorkspace>
		</ToolWorkspace>
	);
}
