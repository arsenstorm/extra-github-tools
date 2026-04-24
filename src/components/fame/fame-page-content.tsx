import PageHeading from "@/components/page-heading";
import { Divider } from "@/components/ui/divider";
import { Strong, Text } from "@/components/ui/text";
import type { FamePageData } from "@/server-functions";
import { FameGate } from "./fame-gate";
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
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="See how your commits compare to your colleagues and who's doing more."
				title="Commit Fame"
			/>
			{org ? null : (
				<>
					<Text>Select the organization or user account to analyze.</Text>
					<Divider className="my-6" />
					<FameGate hasGitHubAccess={hasGitHubAccess} isSignedIn={isSignedIn}>
						<OrganizationsTable
							accounts={pageData.organizations}
							onSelect={onSelectOrganization}
						/>
					</FameGate>
				</>
			)}
			{org && !repo ? (
				<>
					<Text>
						Select a repository from <Strong>{org}</Strong> to analyze.
					</Text>
					<Divider className="my-6" />
					<FameGate hasGitHubAccess={hasGitHubAccess} isSignedIn={isSignedIn}>
						<RepositoriesTable
							onSelect={onSelectRepository}
							repositories={pageData.repositories}
						/>
					</FameGate>
				</>
			) : null}
			{org && repo ? (
				<FameGate hasGitHubAccess={hasGitHubAccess} isSignedIn={isSignedIn}>
					<RepoAnalysisPanel
						error={pageData.error}
						org={org}
						repo={repo}
						stats={pageData.stats}
						statsPending={pageData.statsPending}
					/>
				</FameGate>
			) : null}
		</div>
	);
}
