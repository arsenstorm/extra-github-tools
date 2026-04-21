import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAppSession } from "@/app-session";
import PageHeading from "@/components/page-heading";
import RequireSignIn from "@/components/require-sign-in";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Strong, Text, TextLink } from "@/components/ui/text";
import type { GitHubAccount, GitHubRepository, RepoStats } from "@/github";
import { type FamePageData, getFamePageData } from "@/server-functions";

interface FameSearch {
	org?: string;
	repo?: string;
}

const FAME_STATS_PENDING_REFRESH_MS = 5000;

const normalizeSearchValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const validateFameSearch = (search: Record<string, unknown>): FameSearch => ({
	org: normalizeSearchValue(search.org),
	repo: normalizeSearchValue(search.repo),
});

const getGitHubAccessRefreshDescription = (): string =>
	"Your session is active, but GitHub access is unavailable. Sign in with GitHub again to continue.";

export const Route = createFileRoute("/fame")({
	component: FameRoute,
	head: () => ({
		meta: [
			{
				title: "Commit Fame - Extra GitHub Tools",
			},
			{
				content:
					"See how your commits compare to your colleagues and who's doing more.",
				name: "description",
			},
		],
	}),
	loader: ({ deps }) => getFamePageData({ data: deps }),
	loaderDeps: ({ search }) => search,
	pendingComponent: FamePendingState,
	pendingMs: 0,
	validateSearch: validateFameSearch,
});

function FameRoute() {
	const appSession = useAppSession();
	const pageData = Route.useLoaderData();
	const router = useRouter();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	useEffect(() => {
		if (pageData.error) {
			toast.error(pageData.error);
		}
	}, [pageData.error]);

	useEffect(() => {
		if (!(pageData.statsPending && search.org && search.repo)) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			router.invalidate().catch((error: unknown) => {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to refresh repository statistics."
				);
			});
		}, FAME_STATS_PENDING_REFRESH_MS);

		return () => window.clearTimeout(timeoutId);
	}, [pageData.statsPending, router, search.org, search.repo]);

	return (
		<FamePageContent
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isSignedIn={Boolean(appSession.session)}
			onSelectOrganization={(organizationHandle) =>
				navigate({
					search: {
						org: organizationHandle,
						repo: undefined,
					},
				})
			}
			onSelectRepository={(repositoryName) =>
				navigate({
					search: {
						org: search.org,
						repo: repositoryName,
					},
				})
			}
			org={search.org}
			pageData={pageData}
			repo={search.repo}
		/>
	);
}

export function FamePendingState() {
	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="See how your commits compare to your colleagues and who's doing more."
				title="Commit Fame"
			/>
			<div className="flex flex-col items-center justify-center space-y-4 py-12">
				<div className="h-12 w-12 animate-spin rounded-full border-zinc-900 border-t-2 border-b-2 dark:border-zinc-100" />
				<Text className="font-medium text-lg">Analyzing repository...</Text>
				<Text className="text-sm text-zinc-500">
					This may take a moment for larger repositories.
				</Text>
			</div>
		</div>
	);
}

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

function FameGate({
	children,
	hasGitHubAccess,
	isSignedIn,
}: Readonly<{
	children: React.ReactNode;
	hasGitHubAccess: boolean;
	isSignedIn: boolean;
}>) {
	if (!isSignedIn) {
		return <RequireSignIn />;
	}

	if (!hasGitHubAccess) {
		return (
			<RequireSignIn
				description={getGitHubAccessRefreshDescription()}
				title="GitHub access needs refreshing"
			/>
		);
	}

	return <>{children}</>;
}

function OrganizationsTable({
	accounts,
	onSelect,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	onSelect: (organizationHandle: string) => void;
}>) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader>ID</TableHeader>
					<TableHeader>Avatar</TableHeader>
					<TableHeader>Name</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{accounts && accounts.length > 0 ? (
					accounts.map((account) => (
						<TableRow
							className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
							key={account.handle}
							onClick={() => onSelect(account.handle)}
						>
							<TableCell className="font-medium">{account.id}</TableCell>
							<TableCell>
								<img
									alt={account.handle}
									className="size-8 rounded-full"
									height={32}
									src={account.avatar}
									width={32}
								/>
							</TableCell>
							<TableCell>
								<Text>{account.handle}</Text>
							</TableCell>
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell className="text-center" colSpan={3}>
							No GitHub accounts found.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}

function RepositoriesTable({
	onSelect,
	repositories,
}: Readonly<{
	onSelect: (repositoryName: string) => void;
	repositories: GitHubRepository[] | null;
}>) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader>ID</TableHeader>
					<TableHeader>Name</TableHeader>
					<TableHeader>Full Name</TableHeader>
					<TableHeader>Actions</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{repositories && repositories.length > 0 ? (
					repositories.map((repository) => (
						<TableRow
							className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
							key={repository.id}
							onClick={() => onSelect(repository.name)}
						>
							<TableCell className="font-medium">{repository.id}</TableCell>
							<TableCell>
								<Text>{repository.name}</Text>
							</TableCell>
							<TableCell>
								<Text>{repository.fullName}</Text>
							</TableCell>
							<TableCell>
								<Text>
									<TextLink
										href={repository.htmlUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										View on GitHub
									</TextLink>
								</Text>
							</TableCell>
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell className="text-center" colSpan={4}>
							No repositories found.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}

function RepoAnalysisPanel({
	error,
	org,
	repo,
	stats,
	statsPending,
}: Readonly<{
	error: string | null;
	org: string;
	repo: string;
	stats: RepoStats | null;
	statsPending: boolean;
}>) {
	if (statsPending) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 py-12">
				<div className="h-12 w-12 animate-spin rounded-full border-zinc-900 border-t-2 border-b-2 dark:border-zinc-100" />
				<Text className="font-medium text-lg">
					GitHub is calculating contributor statistics
				</Text>
				<Text className="max-w-md text-center text-sm text-zinc-500">
					{org}/{repo} is not ready yet. This page will retry automatically.
				</Text>
			</div>
		);
	}

	if (error) {
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

	if (!stats) {
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

	const totalChanges = stats.totalAdditions + stats.totalDeletions;

	return (
		<div className="space-y-8">
			<Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
				<CardHeader className="border-zinc-200 border-b bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
					<CardTitle>Repository Overview</CardTitle>
					<CardDescription>
						Summary statistics for {org}/{repo}
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="grid grid-cols-2 md:grid-cols-4">
						<OverviewMetric label="Total Commits" value={stats.totalCommits} />
						<OverviewMetric label="Files" value={stats.totalFiles} />
						<OverviewMetric label="Lines of Code" value={stats.totalLines} />
						<OverviewMetric
							isLast
							label="Contributors"
							value={stats.contributors.length}
						/>
						<OverviewMetric
							className="col-span-2 border-zinc-200 border-r border-b md:border-b-0 dark:border-zinc-800"
							label="Lines Added"
							tone="positive"
							value={stats.totalAdditions}
						/>
						<OverviewMetric
							className="col-span-2"
							label="Lines Deleted"
							tone="negative"
							value={stats.totalDeletions}
						/>
					</div>
					{totalChanges > 0 ? (
						<div className="border-zinc-200 border-t p-6 dark:border-zinc-800">
							<Text className="mb-2 font-medium text-sm">
								Code Changes Distribution
							</Text>
							<div className="h-4 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
								<div
									className="h-full bg-emerald-500 dark:bg-emerald-600"
									style={{
										width: `${(stats.totalAdditions / totalChanges) * 100}%`,
									}}
								/>
								<div
									className="h-full bg-red-500 dark:bg-red-600"
									style={{
										marginTop: "-1rem",
										width: `${(stats.totalDeletions / totalChanges) * 100}%`,
									}}
								/>
							</div>
							<div className="mt-2 flex justify-between text-xs text-zinc-500">
								<div className="flex items-center">
									<div className="mr-1 h-3 w-3 rounded-full bg-emerald-500" />
									Additions (
									{((stats.totalAdditions / totalChanges) * 100).toFixed(1)}%)
								</div>
								<div className="flex items-center">
									<div className="mr-1 h-3 w-3 rounded-full bg-red-500" />
									Deletions (
									{((stats.totalDeletions / totalChanges) * 100).toFixed(1)}%)
								</div>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>
			<Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
				<CardHeader className="border-zinc-200 border-b bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
					<CardTitle>Contributors</CardTitle>
					<CardDescription>Contribution breakdown by developer</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{stats.contributors.map((contributor, index) => (
						<div
							className={
								index === stats.contributors.length - 1
									? "p-6"
									: "border-zinc-200 border-b p-6 dark:border-zinc-800"
							}
							key={`${contributor.email}-${contributor.name}`}
						>
							<div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
								<div>
									<Text className="font-semibold text-lg">
										{contributor.name}
									</Text>
									<Text className="text-sm text-zinc-500">
										{contributor.email}
									</Text>
								</div>
								<div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
									<svg
										aria-hidden="true"
										className="h-4 w-4 text-zinc-500"
										fill="none"
										viewBox="0 0 24 24"
									>
										<path
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
										/>
									</svg>
									<Text className="font-medium">
										{contributor.commits.toLocaleString()} commits
									</Text>
									<div className="rounded-full bg-zinc-200 px-2 py-0.5 font-medium text-xs dark:bg-zinc-700">
										{contributor.percentage.toFixed(1)}%
									</div>
								</div>
							</div>
							<div className="relative pt-1">
								<div className="mb-2 flex items-center justify-between">
									<div className="flex gap-4">
										<div className="flex items-center">
											<div className="mr-1 h-3 w-3 rounded-full bg-emerald-500" />
											<span className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
												+{contributor.additions.toLocaleString()}
											</span>
										</div>
										<div className="flex items-center">
											<div className="mr-1 h-3 w-3 rounded-full bg-red-500" />
											<span className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
												-{contributor.deletions.toLocaleString()}
											</span>
										</div>
									</div>
									<span className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
										{contributor.files.toLocaleString()} files
									</span>
								</div>
								<div className="flex h-2 overflow-hidden rounded-full bg-zinc-200 text-xs dark:bg-zinc-700">
									<div
										className="flex flex-col justify-center whitespace-nowrap bg-blue-500 text-center text-white shadow-none"
										style={{ width: `${contributor.percentage}%` }}
									/>
								</div>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

function OverviewMetric({
	className,
	isLast = false,
	label,
	tone = "default",
	value,
}: Readonly<{
	className?: string;
	isLast?: boolean;
	label: string;
	tone?: "default" | "negative" | "positive";
	value: number;
}>) {
	let valueClassName = "mt-2 font-bold text-3xl";
	let valuePrefix = "";

	if (tone === "positive") {
		valueClassName =
			"mt-2 font-bold text-3xl text-emerald-600 dark:text-emerald-400";
		valuePrefix = "+";
	} else if (tone === "negative") {
		valueClassName = "mt-2 font-bold text-3xl text-red-600 dark:text-red-400";
		valuePrefix = "-";
	}

	return (
		<div
			className={[
				"border-zinc-200 border-b p-6 dark:border-zinc-800",
				isLast ? "" : "border-r",
				className ?? "",
			]
				.join(" ")
				.trim()}
		>
			<Text className="font-medium text-sm text-zinc-500 dark:text-zinc-400">
				{label}
			</Text>
			<Text className={valueClassName}>
				{valuePrefix}
				{value.toLocaleString()}
			</Text>
		</div>
	);
}
