import PageHeading from "@/components/page-heading";
import { GitHubAccessGate } from "@/components/repositories/gate";
import type { Tool } from "@/tools";

export function ToolPage({
	children,
	tool,
}: Readonly<{
	children: React.ReactNode;
	tool: Tool;
}>) {
	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading description={tool.description} title={tool.title} />
			{children}
		</div>
	);
}

/** A tool page whose content sits behind the GitHub access gate. */
export function ToolWorkspace({
	children,
	hasGitHubAccess,
	isSignedIn,
	tool,
}: Readonly<{
	children: React.ReactNode;
	hasGitHubAccess: boolean;
	isSignedIn: boolean;
	tool: Tool;
}>) {
	return (
		<ToolPage tool={tool}>
			<GitHubAccessGate
				hasGitHubAccess={hasGitHubAccess}
				isSignedIn={isSignedIn}
			>
				<section className="space-y-6">{children}</section>
			</GitHubAccessGate>
		</ToolPage>
	);
}
