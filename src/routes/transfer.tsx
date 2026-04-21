import { Checkbox } from "@headlessui/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppSession } from "@/app-session";
import PageHeading from "@/components/page-heading";
import RequireSignIn from "@/components/require-sign-in";
import { Button } from "@/components/ui/button";
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
import type { GitHubAccount, GitHubRepository } from "@/github";
import {
	getTransferPageData,
	type TransferPageData,
	transferRepositoriesAction,
} from "@/server-functions";

interface TransferSearch {
	from?: string;
	to?: string;
}

const normalizeSearchValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const validateTransferSearch = (
	search: Record<string, unknown>
): TransferSearch => ({
	from: normalizeSearchValue(search.from),
	to: normalizeSearchValue(search.to),
});

const getGitHubAccessRefreshDescription = (): string =>
	"Your session is active, but GitHub access is unavailable. Sign in with GitHub again to continue.";

export const Route = createFileRoute("/transfer")({
	component: TransferRoute,
	head: () => ({
		meta: [
			{
				title: "Bulk Transfer Repositories - Extra GitHub Tools",
			},
			{
				content:
					"Move your repositories in bulk between organizations and personal accounts.",
				name: "description",
			},
		],
	}),
	loader: ({ deps }) => getTransferPageData({ data: deps }),
	loaderDeps: ({ search }) => search,
	pendingComponent: TransferPendingState,
	pendingMs: 0,
	validateSearch: validateTransferSearch,
});

function TransferRoute() {
	const appSession = useAppSession();
	const pageData = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const transferRepositories = useServerFn(transferRepositoriesAction);

	useEffect(() => {
		if (pageData.error) {
			toast.error(pageData.error);
		}
	}, [pageData.error]);

	return (
		<TransferPageContent
			from={search.from}
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isSignedIn={Boolean(appSession.session)}
			onBackToOrganizationSelection={() =>
				navigate({
					search: (previousSearch) => ({
						...previousSearch,
						to: undefined,
					}),
				})
			}
			onResetFlow={() =>
				navigate({
					search: {},
				})
			}
			onSelectFrom={(fromOrganization) =>
				navigate({
					search: {
						from: fromOrganization,
						to: undefined,
					},
				})
			}
			onSelectTo={(toOrganization) =>
				navigate({
					search: {
						from: search.from,
						to: toOrganization,
					},
				})
			}
			onTransfer={async (repositories) => {
				if (!(search.from && search.to)) {
					return false;
				}

				const result = await transferRepositories({
					data: {
						from: search.from,
						repositories,
						to: search.to,
					},
				});

				if (!result.success) {
					toast.error(result.error ?? "Failed to transfer repositories.");
					return false;
				}

				toast.success("Repositories transferred successfully.");
				await router.invalidate();
				return true;
			}}
			pageData={pageData}
			to={search.to}
		/>
	);
}

export function TransferPendingState() {
	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="Move your repositories in bulk between organizations and personal accounts."
				title="Bulk Transfer Repositories"
			/>
			<Text>Loading transfer data...</Text>
		</div>
	);
}

export function TransferPageContent({
	from,
	hasGitHubAccess,
	isSignedIn,
	onBackToOrganizationSelection,
	onResetFlow,
	onSelectFrom,
	onSelectTo,
	onTransfer,
	pageData,
	to,
}: Readonly<{
	from?: string;
	hasGitHubAccess: boolean;
	isSignedIn: boolean;
	onBackToOrganizationSelection: () => void;
	onResetFlow: () => void;
	onSelectFrom: (organizationHandle: string) => void;
	onSelectTo: (organizationHandle: string) => void;
	onTransfer: (repositories: string[]) => Promise<boolean>;
	pageData: TransferPageData;
	to?: string;
}>) {
	const [isTransferring, setIsTransferring] = useState(false);
	const [selectedRepositories, setSelectedRepositories] = useState<string[]>(
		[]
	);
	const selectionResetKey = `${from ?? ""}:${to ?? ""}:${
		pageData.repositories?.map((repository) => repository.name).join("|") ?? ""
	}`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: this local selection should reset whenever the flow step or repository list changes.
	useEffect(() => {
		setSelectedRepositories([]);
	}, [selectionResetKey]);

	const updateSelectedRepositories = (repositoryName: string): void => {
		setSelectedRepositories((previousRepositories) => {
			if (previousRepositories.includes(repositoryName)) {
				return previousRepositories.filter((name) => name !== repositoryName);
			}

			return [...previousRepositories, repositoryName];
		});
	};

	const handleTransfer = async (): Promise<void> => {
		setIsTransferring(true);

		try {
			const didTransfer = await onTransfer(selectedRepositories);

			if (didTransfer) {
				setSelectedRepositories([]);
			}
		} finally {
			setIsTransferring(false);
		}
	};

	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="Move your repositories in bulk between organizations and personal accounts."
				title="Bulk Transfer Repositories"
			/>
			{from ? null : (
				<>
					<Text>
						Select the organization you want to transfer repositories{" "}
						<Strong>from</Strong>.
					</Text>
					<Divider className="my-6" />
					<TransferGate
						hasGitHubAccess={hasGitHubAccess}
						isSignedIn={isSignedIn}
					>
						<OrganizationsTable
							accounts={pageData.organizations}
							onSelect={onSelectFrom}
						/>
					</TransferGate>
				</>
			)}
			{from && !to ? (
				<>
					<Text>
						Select the organization you want to transfer repositories{" "}
						<Strong>to</Strong>.
					</Text>
					<Button className="mt-2 self-start" onClick={onResetFlow} outline>
						Back to start
					</Button>
					<Divider className="my-6" />
					<TransferGate
						hasGitHubAccess={hasGitHubAccess}
						isSignedIn={isSignedIn}
					>
						<OrganizationsTable
							accounts={pageData.organizations}
							onSelect={onSelectTo}
						/>
					</TransferGate>
				</>
			) : null}
			{from && to ? (
				<>
					<Text>
						Now select which repositories you want to transfer from{" "}
						<Strong>{from}</Strong> to <Strong>{to}</Strong>.
					</Text>
					<Button
						className="mt-2 self-start"
						onClick={onBackToOrganizationSelection}
						outline
					>
						Back to organization selection
					</Button>
					<Divider className="my-6" />
					<TransferGate
						hasGitHubAccess={hasGitHubAccess}
						isSignedIn={isSignedIn}
					>
						<RepositoriesTable
							onToggle={updateSelectedRepositories}
							repositories={pageData.repositories}
							selectedRepositories={selectedRepositories}
						/>
						{selectedRepositories.length > 0 ? (
							<div className="fixed right-0 bottom-4 left-0 z-50 mx-auto max-w-sm rounded-lg bg-zinc-950/5 p-4 backdrop-blur-md dark:bg-zinc-50/5">
								<div className="flex flex-col items-center justify-center gap-4 text-center">
									<Text>
										Ready to transfer {selectedRepositories.length} repositories
										from <Strong>{from}</Strong> to <Strong>{to}</Strong>?
									</Text>
									<Button
										className="w-full"
										color="red"
										disabled={isTransferring}
										onClick={handleTransfer}
									>
										{isTransferring
											? "Transferring..."
											: `Transfer ${selectedRepositories.length} Repositories`}
									</Button>
								</div>
							</div>
						) : null}
					</TransferGate>
				</>
			) : null}
		</div>
	);
}

function TransferGate({
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
	onToggle,
	repositories,
	selectedRepositories,
}: Readonly<{
	onToggle: (repositoryName: string) => void;
	repositories: GitHubRepository[] | null;
	selectedRepositories: string[];
}>) {
	return (
		<div className="mb-32">
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Select</TableHeader>
						<TableHeader>ID</TableHeader>
						<TableHeader>Name</TableHeader>
						<TableHeader>Full Name</TableHeader>
						<TableHeader>Actions</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{repositories && repositories.length > 0 ? (
						repositories.map((repository) => (
							<TableRow key={repository.id}>
								<TableCell>
									<Checkbox
										aria-label={`Select ${repository.name}`}
										checked={selectedRepositories.includes(repository.name)}
										className="group block size-4 rounded border bg-white data-checked:bg-zinc-500"
										onChange={() => onToggle(repository.name)}
									>
										<svg
											aria-hidden="true"
											className="stroke-white opacity-0 group-data-checked:opacity-100"
											fill="none"
											viewBox="0 0 14 14"
										>
											<path
												d="M3 8L6 11L11 3.5"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
											/>
										</svg>
									</Checkbox>
								</TableCell>
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
							<TableCell className="text-center" colSpan={5}>
								No repositories found.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
