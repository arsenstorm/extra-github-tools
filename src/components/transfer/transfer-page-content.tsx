import { RepositoryWorkspace } from "@/components/repositories/repository-workspace";
import { ToolWorkspace } from "@/components/tool-page";
import type { GitHubAccount } from "@/github/types";
import type {
	RepositoriesPage,
	TransferRepositoriesResult,
} from "@/server-functions";
import { TOOLS } from "@/tools";
import { TRANSFER_TABLE_COLUMNS } from "./repositories-table";
import { TransferRepositoriesSection } from "./transfer-repositories-section";
import { TransferToolbar } from "./transfer-toolbar";
import type { RepositoryTransferOptions } from "./types";

const getStartMessage = (from?: string, to?: string): string => {
	if (from && to && from === to) {
		return "Choose different source and destination accounts.";
	}

	return from || to
		? "Choose a valid source and destination to load repositories."
		: "Choose the source and destination accounts to begin.";
};

export function TransferPageContent({
	accounts,
	from,
	hasGitHubAccess,
	isLoadingRepositories,
	isSignedIn,
	onLoadPage,
	onPreloadSource,
	onSelectFrom,
	onSelectTo,
	onTransfer,
	repositoriesData,
	to,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	from?: string;
	hasGitHubAccess: boolean;
	isLoadingRepositories: boolean;
	isSignedIn: boolean;
	onLoadPage: (cursor: string) => Promise<RepositoriesPage>;
	onPreloadSource: (accountHandle: string) => void;
	onSelectFrom: (accountHandle: string) => void;
	onSelectTo: (accountHandle: string) => void;
	onTransfer: (
		repositories: string[],
		transferOptions: RepositoryTransferOptions
	) => Promise<TransferRepositoriesResult>;
	repositoriesData: Promise<RepositoriesPage> | null;
	to?: string;
}>) {
	const hasValidAccounts = Boolean(from && to && from !== to);

	return (
		<ToolWorkspace
			hasGitHubAccess={hasGitHubAccess}
			isSignedIn={isSignedIn}
			tool={TOOLS.transfer}
		>
			<RepositoryWorkspace
				columns={TRANSFER_TABLE_COLUMNS}
				isLoading={isLoadingRepositories}
				promise={hasValidAccounts ? repositoriesData : null}
				resetKey={from ?? ""}
				startMessage={getStartMessage(from, to)}
				toolbar={
					<TransferToolbar
						accounts={accounts}
						disabled
						from={from}
						onPreloadSource={onPreloadSource}
						onSelectFrom={onSelectFrom}
						onSelectTo={onSelectTo}
						to={to}
					/>
				}
			>
				{(data) =>
					from && to ? (
						<TransferRepositoriesSection
							accounts={accounts}
							data={data}
							from={from}
							key={from}
							onLoadPage={onLoadPage}
							onPreloadSource={onPreloadSource}
							onSelectFrom={onSelectFrom}
							onSelectTo={onSelectTo}
							onTransfer={onTransfer}
							to={to}
						/>
					) : null
				}
			</RepositoryWorkspace>
		</ToolWorkspace>
	);
}
