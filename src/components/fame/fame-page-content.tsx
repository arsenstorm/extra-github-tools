import { GitHubAccessGate } from "@/components/repositories/gate";
import { ToolPage } from "@/components/tool-page";
import { Divider } from "@/components/ui/divider";
import { Strong, Text } from "@/components/ui/text";
import type { FamePageData } from "@/server-functions";
import { TOOLS } from "@/tools";
import { OrganizationsTable } from "./organizations-table";
import { RepoAnalysisPanel } from "./repo-analysis-panel";
import { RepositoriesTable } from "./repositories-table";

export function FamePageContent({
	hasGitHubAccess,
	isSignedIn,
	onSelectOrganization,
	onSelectRepository,
	org,
	pageData,
	repo,
}: Readonly<{
	hasGitHubAccess: boolean;
	isSignedIn: boolean;
	onSelectOrganization: (organizationHandle: string) => void;
	onSelectRepository: (repositoryName: string) => void;
	org?: string;
	pageData: FamePageData;
	repo?: string;
}>) {
	return (
		<ToolPage tool={TOOLS.fame}>
			{org ? null : (
				<>
					<Text>Select the organization or user account to analyze.</Text>
					<Divider className="my-6" />
					<GitHubAccessGate
						hasGitHubAccess={hasGitHubAccess}
						isSignedIn={isSignedIn}
					>
						<OrganizationsTable
							accounts={pageData.organizations}
							onSelect={onSelectOrganization}
						/>
					</GitHubAccessGate>
				</>
			)}
			{org && !repo ? (
				<>
					<Text>
						Select a repository from <Strong>{org}</Strong> to analyze.
					</Text>
					<Divider className="my-6" />
					<GitHubAccessGate
						hasGitHubAccess={hasGitHubAccess}
						isSignedIn={isSignedIn}
					>
						<RepositoriesTable
							onSelect={onSelectRepository}
							repositories={pageData.repositories}
						/>
					</GitHubAccessGate>
				</>
			) : null}
			{org && repo ? (
				<GitHubAccessGate
					hasGitHubAccess={hasGitHubAccess}
					isSignedIn={isSignedIn}
				>
					<RepoAnalysisPanel
						error={pageData.error}
						org={org}
						repo={repo}
						stats={pageData.stats}
						statsPending={pageData.statsPending}
					/>
				</GitHubAccessGate>
			) : null}
		</ToolPage>
	);
}
