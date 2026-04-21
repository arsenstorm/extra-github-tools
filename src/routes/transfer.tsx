import { Checkbox } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import {
	createFileRoute,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	ArrowRight,
	CheckCircle2,
	ChevronDown,
	CircleAlert,
	RefreshCcw,
} from "lucide-react";
import {
	type KeyboardEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useAppSession } from "@/app-session";
import PageHeading from "@/components/page-heading";
import RequireSignIn from "@/components/require-sign-in";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import {
	Description,
	Field,
	FieldGroup,
	Fieldset,
	Label,
} from "@/components/ui/fieldset";
import { Input, InputGroup } from "@/components/ui/input";
import { Listbox, ListboxLabel, ListboxOption } from "@/components/ui/listbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Strong, Text, TextLink } from "@/components/ui/text";
import type {
	GitHubAccount,
	GitHubRepository,
	TransferRepositoryArchiveState,
	TransferRepositoryResult,
	TransferRepositoryVisibility,
} from "@/github";
import {
	getTransferPageData,
	type TransferPageData,
	type TransferRepositoriesResult,
	transferRepositoriesAction,
} from "@/server-functions";

interface TransferSearch {
	from?: string;
	to?: string;
}

type RepositoryStatus = "failed" | "idle" | "pending" | "transferred";

interface RepositoryTransferOptions {
	archiveState: TransferRepositoryArchiveState;
	namePrefix: string;
	nameSuffix: string;
	visibility: TransferRepositoryVisibility;
}

const CONFIRMATION_REQUIRED_REPOSITORY_COUNT = 5;

const REPOSITORY_VISIBILITY_OPTIONS = [
	{
		label: "Keep current",
		value: "current",
	},
	{
		label: "Private",
		value: "private",
	},
	{
		label: "Public",
		value: "public",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: TransferRepositoryVisibility;
}>;

const REPOSITORY_ARCHIVE_STATE_OPTIONS = [
	{
		label: "Keep current",
		value: "current",
	},
	{
		label: "Archive",
		value: "archived",
	},
	{
		label: "Unarchive",
		value: "unarchived",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: TransferRepositoryArchiveState;
}>;

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

const formatRepositoryPushedAt = (pushedAt: string | null): string => {
	if (!pushedAt) {
		return "Never pushed";
	}

	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
		year: "numeric",
	}).format(new Date(pushedAt));
};

const getSelectedRepositoryNames = (
	repositoryNames: Iterable<string>,
	repositories: GitHubRepository[]
): string[] => {
	const selectedRepositoryNames = new Set(repositoryNames);

	return repositories
		.filter((repository) => selectedRepositoryNames.has(repository.name))
		.map((repository) => repository.name);
};

const getRepositoryStatus = (
	repositoryName: string,
	pendingRepositories: Set<string>,
	resultsByRepository: Map<string, TransferRepositoryResult>
): RepositoryStatus => {
	if (pendingRepositories.has(repositoryName)) {
		return "pending";
	}

	const result = resultsByRepository.get(repositoryName);

	if (!result) {
		return "idle";
	}

	return result.ok ? "transferred" : "failed";
};

const getTransferredRepositoryName = (
	repositoryName: string,
	transferOptions: Pick<RepositoryTransferOptions, "namePrefix" | "nameSuffix">
): string =>
	`${transferOptions.namePrefix}${repositoryName}${transferOptions.nameSuffix}`;

const getPostTransferSettingsSummary = (
	transferOptions: RepositoryTransferOptions
): string => {
	const settings: string[] = [];

	if (transferOptions.visibility !== "current") {
		settings.push(
			`make ${transferOptions.visibility === "private" ? "private" : "public"}`
		);
	}

	if (transferOptions.archiveState === "archived") {
		settings.push("archive");
	} else if (transferOptions.archiveState === "unarchived") {
		settings.push("unarchive");
	}

	return settings.length > 0
		? settings.join("; ")
		: "keep current visibility and archive state";
};

const getPostTransferSettingsFailureCount = (
	results: TransferRepositoryResult[] | null
): number =>
	results?.filter((result) => result.postTransferSettings?.ok === false)
		.length ?? 0;

const getTransferResultDetails = (result: TransferRepositoryResult): string => {
	if (!result.ok) {
		return result.error ?? `${result.status} ${result.statusText}`;
	}

	if (result.postTransferSettings?.ok === false) {
		return `Transferred, but settings update failed: ${
			result.postTransferSettings.error ??
			`${result.postTransferSettings.status} ${result.postTransferSettings.statusText}`
		}`;
	}

	if (result.postTransferSettings?.ok) {
		return `Transferred; settings updated (${result.postTransferSettings.status} ${result.postTransferSettings.statusText}).`;
	}

	return `${result.status} ${result.statusText}`;
};

const getTransferResultLabel = (result: TransferRepositoryResult): string => {
	if (!result.ok) {
		return "Failed";
	}

	if (result.postTransferSettings?.ok === false) {
		return "Transferred; settings failed";
	}

	return "Transferred";
};

const isTransferResultComplete = (result: TransferRepositoryResult): boolean =>
	result.ok && result.postTransferSettings?.ok !== false;

const getCountLabel = (
	count: number,
	singularLabel: string,
	pluralLabel: string
): string => `${count} ${count === 1 ? singularLabel : pluralLabel}`;

const getTransferFailureToastMessage = (
	failedCount: number,
	settingsFailedCount: number
): string => {
	const failureMessages: string[] = [];

	if (failedCount > 0) {
		failureMessages.push(
			`${getCountLabel(failedCount, "repository", "repositories")} failed to transfer`
		);
	}

	if (settingsFailedCount > 0) {
		failureMessages.push(
			`${getCountLabel(
				settingsFailedCount,
				"settings update",
				"settings updates"
			)} failed`
		);
	}

	return `${failureMessages.join("; ")}.`;
};

const getTransferResultCounts = (
	result: TransferRepositoriesResult
): {
	failedCount: number;
	settingsFailedCount: number;
	transferredCount: number;
} => {
	const transferredCount =
		result.results?.filter((transferResult) => transferResult.ok).length ?? 0;
	const failedCount =
		result.results?.filter((transferResult) => !transferResult.ok).length ?? 0;

	return {
		failedCount,
		settingsFailedCount: getPostTransferSettingsFailureCount(result.results),
		transferredCount,
	};
};

const showTransferResultToast = (result: TransferRepositoriesResult): void => {
	const { failedCount, settingsFailedCount, transferredCount } =
		getTransferResultCounts(result);

	if (result.success) {
		toast.success(
			`${getCountLabel(
				transferredCount,
				"repository",
				"repositories"
			)} transferred.`
		);
		return;
	}

	if (result.results) {
		toast.error(
			getTransferFailureToastMessage(failedCount, settingsFailedCount)
		);
		return;
	}

	toast.error(result.error ?? "Failed to transfer repositories.");
};

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
	validateSearch: validateTransferSearch,
});

function TransferRoute() {
	const appSession = useAppSession();
	const pageData = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const isLoadingTransferData = useRouterState({
		select: (state) =>
			state.location.pathname === "/transfer" && state.isLoading,
	});
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
			isLoadingTransferData={isLoadingTransferData}
			isSignedIn={Boolean(appSession.session)}
			onResetFlow={() =>
				navigate({
					search: {},
				})
			}
			onSelectFrom={(fromAccount) =>
				navigate({
					search: {
						from: fromAccount,
						to: search.to === fromAccount ? undefined : search.to,
					},
				})
			}
			onSelectTo={(toAccount) =>
				navigate({
					search: {
						from: search.from,
						to: toAccount,
					},
				})
			}
			onTransfer={async (repositories, transferOptions) => {
				if (!(search.from && search.to)) {
					return {
						error: "Choose both a source and destination account.",
						results: null,
						success: false,
					};
				}

				const result = await transferRepositories({
					data: {
						archiveState: transferOptions.archiveState,
						from: search.from,
						namePrefix: transferOptions.namePrefix,
						nameSuffix: transferOptions.nameSuffix,
						repositories,
						to: search.to,
						visibility: transferOptions.visibility,
					},
				});

				showTransferResultToast(result);

				if (getTransferResultCounts(result).transferredCount > 0) {
					await router.invalidate();
				}

				return result;
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
	isLoadingTransferData,
	isSignedIn,
	onResetFlow,
	onSelectFrom,
	onSelectTo,
	onTransfer,
	pageData,
	to,
}: Readonly<{
	from?: string;
	hasGitHubAccess: boolean;
	isLoadingTransferData: boolean;
	isSignedIn: boolean;
	onResetFlow: () => void;
	onSelectFrom: (accountHandle: string) => void;
	onSelectTo: (accountHandle: string) => void;
	onTransfer: (
		repositories: string[],
		transferOptions: RepositoryTransferOptions
	) => Promise<TransferRepositoriesResult>;
	pageData: TransferPageData;
	to?: string;
}>) {
	const [archiveState, setArchiveState] =
		useState<TransferRepositoryArchiveState>("current");
	const [confirmationValue, setConfirmationValue] = useState("");
	const [isReviewing, setIsReviewing] = useState(false);
	const [isTransferring, setIsTransferring] = useState(false);
	const [hiddenTransferredRepositories, setHiddenTransferredRepositories] =
		useState<string[]>([]);
	const [namePrefix, setNamePrefix] = useState("");
	const [nameSuffix, setNameSuffix] = useState("");
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);
	const [rangeAnchorRepository, setRangeAnchorRepository] = useState<
		string | null
	>(null);
	const [repositorySearch, setRepositorySearch] = useState("");
	const [selectedRepositories, setSelectedRepositories] = useState<string[]>(
		[]
	);
	const [transferResults, setTransferResults] = useState<
		TransferRepositoryResult[] | null
	>(null);
	const [visibility, setVisibility] =
		useState<TransferRepositoryVisibility>("current");
	const sourceRepositories = pageData.repositories ?? [];
	const hiddenTransferredRepositorySet = useMemo(
		() => new Set(hiddenTransferredRepositories),
		[hiddenTransferredRepositories]
	);
	const repositories = useMemo(
		() =>
			sourceRepositories.filter(
				(repository) => !hiddenTransferredRepositorySet.has(repository.name)
			),
		[hiddenTransferredRepositorySet, sourceRepositories]
	);
	const filteredRepositories = useMemo(() => {
		const normalizedSearch = repositorySearch.trim().toLowerCase();

		if (!normalizedSearch) {
			return repositories;
		}

		return repositories.filter((repository) =>
			[repository.name, repository.fullName]
				.join(" ")
				.toLowerCase()
				.includes(normalizedSearch)
		);
	}, [repositories, repositorySearch]);
	const visibleRepositoryNames = useMemo(
		() => filteredRepositories.map((repository) => repository.name),
		[filteredRepositories]
	);
	const transferOptions = useMemo(
		() => ({
			archiveState,
			namePrefix,
			nameSuffix,
			visibility,
		}),
		[archiveState, namePrefix, nameSuffix, visibility]
	);
	const selectionResetKey = `${from ?? ""}:${to ?? ""}`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local flow state when the selected accounts change.
	useEffect(() => {
		setArchiveState("current");
		setConfirmationValue("");
		setHiddenTransferredRepositories([]);
		setIsReviewing(false);
		setNamePrefix("");
		setNameSuffix("");
		setPendingRepositories([]);
		setRangeAnchorRepository(null);
		setRepositorySearch("");
		setSelectedRepositories([]);
		setTransferResults(null);
		setVisibility("current");
	}, [selectionResetKey]);

	const updateSelectedRepositories = (
		repositoryName: string,
		shouldSelectRange = false
	): void => {
		setTransferResults(null);
		setIsReviewing(false);
		setConfirmationValue("");
		setSelectedRepositories((previousRepositories) => {
			const nextRepositories = new Set(previousRepositories);
			const anchorIndex = rangeAnchorRepository
				? visibleRepositoryNames.indexOf(rangeAnchorRepository)
				: -1;
			const repositoryIndex = visibleRepositoryNames.indexOf(repositoryName);

			if (shouldSelectRange && anchorIndex >= 0 && repositoryIndex >= 0) {
				const rangeStart = Math.min(anchorIndex, repositoryIndex);
				const rangeEnd = Math.max(anchorIndex, repositoryIndex);
				const shouldSelectRepositories = !nextRepositories.has(repositoryName);

				for (const visibleRepositoryName of visibleRepositoryNames.slice(
					rangeStart,
					rangeEnd + 1
				)) {
					if (shouldSelectRepositories) {
						nextRepositories.add(visibleRepositoryName);
					} else {
						nextRepositories.delete(visibleRepositoryName);
					}
				}

				return getSelectedRepositoryNames(nextRepositories, repositories);
			}

			if (nextRepositories.has(repositoryName)) {
				nextRepositories.delete(repositoryName);
			} else {
				nextRepositories.add(repositoryName);
			}

			return getSelectedRepositoryNames(nextRepositories, repositories);
		});
		setRangeAnchorRepository(repositoryName);
	};

	const handleTransfer = async (): Promise<void> => {
		setIsTransferring(true);
		setPendingRepositories(selectedRepositories);

		try {
			const result = await onTransfer(selectedRepositories, transferOptions);

			setTransferResults(result.results);
			setIsReviewing(false);
			setConfirmationValue("");

			if (result.results) {
				const transferredRepositories = result.results
					.filter((transferResult) => transferResult.ok)
					.map((transferResult) => transferResult.repository);
				const failedRepositories = result.results
					.filter((transferResult) => !transferResult.ok)
					.map((transferResult) => transferResult.repository);

				setHiddenTransferredRepositories((previousRepositories) => [
					...new Set([...previousRepositories, ...transferredRepositories]),
				]);
				setSelectedRepositories(
					getSelectedRepositoryNames(failedRepositories, repositories)
				);
				setRangeAnchorRepository(null);
			}
		} finally {
			setPendingRepositories([]);
			setIsTransferring(false);
		}
	};

	const retryFailedTransfers = (): void => {
		if (!transferResults) {
			return;
		}

		const failedRepositories = transferResults
			.filter((transferResult) => !transferResult.ok)
			.map((transferResult) => transferResult.repository);

		setSelectedRepositories(
			getSelectedRepositoryNames(failedRepositories, repositories)
		);
		setRangeAnchorRepository(null);
		setConfirmationValue("");
		setIsReviewing(true);
	};

	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="Move your repositories in bulk between organizations and personal accounts."
				title="Bulk Transfer Repositories"
			/>
			<TransferGate hasGitHubAccess={hasGitHubAccess} isSignedIn={isSignedIn}>
				<div className="space-y-8">
					<AccountTransferPanel
						accounts={pageData.organizations}
						from={from}
						isLoading={isLoadingTransferData}
						onReset={onResetFlow}
						onSelectFrom={onSelectFrom}
						onSelectTo={onSelectTo}
						to={to}
					/>
					{from && to && from !== to ? (
						<RepositoryTransferWorkbench
							archiveState={archiveState}
							confirmationValue={confirmationValue}
							filteredRepositories={filteredRepositories}
							from={from}
							isReviewing={isReviewing}
							isTransferring={isTransferring}
							namePrefix={namePrefix}
							nameSuffix={nameSuffix}
							onCancelReview={() => {
								setConfirmationValue("");
								setIsReviewing(false);
							}}
							onChangeArchiveState={setArchiveState}
							onChangeConfirmationValue={setConfirmationValue}
							onChangeNamePrefix={setNamePrefix}
							onChangeNameSuffix={setNameSuffix}
							onChangeSearch={setRepositorySearch}
							onChangeVisibility={setVisibility}
							onClearResults={() => setTransferResults(null)}
							onConfirmTransfer={handleTransfer}
							onRetryFailedTransfers={retryFailedTransfers}
							onReviewTransfer={() => {
								setTransferResults(null);
								setIsReviewing(true);
							}}
							onToggleRepository={updateSelectedRepositories}
							pendingRepositories={pendingRepositories}
							repositories={repositories}
							repositorySearch={repositorySearch}
							selectedRepositories={selectedRepositories}
							to={to}
							transferResults={transferResults}
							visibility={visibility}
						/>
					) : (
						<TransferStartState from={from} to={to} />
					)}
				</div>
			</TransferGate>
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

function AccountTransferPanel({
	accounts,
	from,
	isLoading,
	onReset,
	onSelectFrom,
	onSelectTo,
	to,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	from?: string;
	isLoading: boolean;
	onReset: () => void;
	onSelectFrom: (accountHandle: string) => void;
	onSelectTo: (accountHandle: string) => void;
	to?: string;
}>) {
	const destinationAccounts =
		accounts?.filter((account) => account.handle !== from) ?? null;

	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
				<Fieldset className="flex-1">
					<div
						className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start"
						data-slot="control"
					>
						<AccountField
							accounts={accounts}
							disabled={isLoading}
							label="Repositories to transfer from"
							onSelect={onSelectFrom}
							placeholder="Choose source"
							value={from}
						/>
						<div aria-hidden="true" className="hidden pt-11 sm:block">
							<ArrowRight className="size-4 text-zinc-400" />
						</div>
						<AccountField
							accounts={destinationAccounts}
							disabled={isLoading}
							label="Repositories to transfer to"
							onSelect={onSelectTo}
							placeholder="Choose destination"
							value={to}
						/>
					</div>
				</Fieldset>
				<Button
					className="self-start sm:self-end"
					disabled={isLoading}
					onClick={onReset}
					outline
				>
					<RefreshCcw data-slot="icon" />
					Reset
				</Button>
			</div>
			{from && to && from === to ? (
				<Text className="mt-4 text-red-600 dark:text-red-500">
					Choose different source and destination accounts.
				</Text>
			) : null}
		</section>
	);
}

function AccountField({
	accounts,
	disabled,
	label,
	onSelect,
	placeholder,
	value,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	disabled: boolean;
	label: string;
	onSelect: (accountHandle: string) => void;
	placeholder: string;
	value?: string;
}>) {
	return (
		<Field>
			<Label>{label}</Label>
			<Listbox
				aria-label={label}
				className="mt-2"
				disabled={disabled || !accounts || accounts.length === 0}
				onChange={onSelect}
				placeholder={placeholder}
				value={value ?? ""}
			>
				{accounts?.map((account) => (
					<ListboxOption key={account.handle} value={account.handle}>
						<img
							alt=""
							className="rounded-full"
							data-slot="avatar"
							height={24}
							src={account.avatar}
							width={24}
						/>
						<ListboxLabel>{account.handle}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	);
}

function TransferStartState({
	from,
	to,
}: Readonly<{
	from?: string;
	to?: string;
}>) {
	return (
		<section className="rounded-lg border border-zinc-950/15 border-dashed p-8 text-center dark:border-white/15">
			<Text>
				{from || to
					? "Choose a valid source and destination to load repositories."
					: "Choose the source and destination accounts to begin."}
			</Text>
		</section>
	);
}

function RepositoryTransferWorkbench({
	archiveState,
	confirmationValue,
	filteredRepositories,
	from,
	isReviewing,
	isTransferring,
	namePrefix,
	nameSuffix,
	onCancelReview,
	onChangeArchiveState,
	onChangeConfirmationValue,
	onChangeNamePrefix,
	onChangeNameSuffix,
	onChangeSearch,
	onChangeVisibility,
	onClearResults,
	onConfirmTransfer,
	onRetryFailedTransfers,
	onReviewTransfer,
	onToggleRepository,
	pendingRepositories,
	repositories,
	repositorySearch,
	selectedRepositories,
	to,
	transferResults,
	visibility,
}: Readonly<{
	archiveState: TransferRepositoryArchiveState;
	confirmationValue: string;
	filteredRepositories: GitHubRepository[];
	from: string;
	isReviewing: boolean;
	isTransferring: boolean;
	namePrefix: string;
	nameSuffix: string;
	onCancelReview: () => void;
	onChangeArchiveState: (value: TransferRepositoryArchiveState) => void;
	onChangeConfirmationValue: (value: string) => void;
	onChangeNamePrefix: (value: string) => void;
	onChangeNameSuffix: (value: string) => void;
	onChangeSearch: (value: string) => void;
	onChangeVisibility: (value: TransferRepositoryVisibility) => void;
	onClearResults: () => void;
	onConfirmTransfer: () => void;
	onRetryFailedTransfers: () => void;
	onReviewTransfer: () => void;
	onToggleRepository: (
		repositoryName: string,
		shouldSelectRange?: boolean
	) => void;
	pendingRepositories: string[];
	repositories: GitHubRepository[];
	repositorySearch: string;
	selectedRepositories: string[];
	to: string;
	transferResults: TransferRepositoryResult[] | null;
	visibility: TransferRepositoryVisibility;
}>) {
	const resultsByRepository = useMemo(
		() =>
			new Map(
				transferResults?.map((result) => [result.repository, result]) ?? []
			),
		[transferResults]
	);
	const pendingRepositorySet = useMemo(
		() => new Set(pendingRepositories),
		[pendingRepositories]
	);
	const selectedRepositorySet = useMemo(
		() => new Set(selectedRepositories),
		[selectedRepositories]
	);
	const transferOptions = useMemo(
		() => ({
			archiveState,
			namePrefix,
			nameSuffix,
			visibility,
		}),
		[archiveState, namePrefix, nameSuffix, visibility]
	);
	const isRenamingRepositories = namePrefix.length > 0 || nameSuffix.length > 0;
	const hasPostTransferSettings =
		visibility !== "current" || archiveState !== "current";
	const previewRepositoryName =
		filteredRepositories[0]?.name ?? repositories[0]?.name ?? "repository";
	const previewTransferredRepositoryName = getTransferredRepositoryName(
		previewRepositoryName,
		transferOptions
	);

	return (
		<section className="space-y-6">
			<RepositoryTransferSettingsPanel
				archiveState={archiveState}
				hasPostTransferSettings={hasPostTransferSettings}
				isRenamingRepositories={isRenamingRepositories}
				isTransferring={isTransferring}
				namePrefix={namePrefix}
				nameSuffix={nameSuffix}
				onChangeArchiveState={onChangeArchiveState}
				onChangeNamePrefix={onChangeNamePrefix}
				onChangeNameSuffix={onChangeNameSuffix}
				onChangeVisibility={onChangeVisibility}
				previewRepositoryName={previewRepositoryName}
				previewTransferredRepositoryName={previewTransferredRepositoryName}
				visibility={visibility}
			/>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Text>
					Select repositories from <Strong>{from}</Strong> to transfer to{" "}
					<Strong>{to}</Strong>.
				</Text>
				<div className="flex flex-col gap-2 sm:min-w-72">
					<InputGroup>
						<MagnifyingGlassIcon />
						<Input
							aria-label="Search repositories"
							onChange={(event) => onChangeSearch(event.target.value)}
							placeholder="Search repositories"
							type="search"
							value={repositorySearch}
						/>
					</InputGroup>
				</div>
			</div>
			<RepositoriesTable
				filteredRepositories={filteredRepositories}
				isTransferring={isTransferring}
				onToggle={onToggleRepository}
				pendingRepositories={pendingRepositorySet}
				resultsByRepository={resultsByRepository}
				selectedRepositories={selectedRepositorySet}
			/>
			{transferResults ? (
				<TransferResultsPanel
					onClearResults={onClearResults}
					onRetryFailedTransfers={onRetryFailedTransfers}
					results={transferResults}
				/>
			) : null}
			{isReviewing ? (
				<TransferReviewPanel
					confirmationValue={confirmationValue}
					from={from}
					isTransferring={isTransferring}
					onCancel={onCancelReview}
					onChangeConfirmationValue={onChangeConfirmationValue}
					onConfirm={onConfirmTransfer}
					repositories={repositories}
					selectedRepositories={selectedRepositories}
					to={to}
					transferOptions={transferOptions}
				/>
			) : (
				<TransferActionBar
					isTransferring={isTransferring}
					onReviewTransfer={onReviewTransfer}
					selectedRepositoryCount={selectedRepositories.length}
				/>
			)}
		</section>
	);
}

function RepositoryTransferSelect<T extends string>({
	ariaLabel,
	disabled,
	onChange,
	options,
	value,
}: Readonly<{
	ariaLabel: string;
	disabled: boolean;
	onChange: (value: T) => void;
	options: ReadonlyArray<{
		label: string;
		value: T;
	}>;
	value: T;
}>) {
	return (
		<span
			className="relative mt-2 block w-full before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm has-data-disabled:opacity-50 has-data-disabled:before:bg-zinc-950/5 has-data-disabled:before:shadow-none dark:before:hidden"
			data-slot="control"
		>
			<select
				aria-label={ariaLabel}
				className="dark:scheme-dark relative block min-h-11 w-full appearance-none rounded-lg border border-zinc-950/10 bg-transparent py-[calc(--spacing(2.5)-1px)] pr-10 pl-[calc(--spacing(3.5)-1px)] text-base/6 text-zinc-950 focus:outline-hidden data-disabled:border-zinc-950/20 sm:min-h-9 sm:py-[calc(--spacing(1.5)-1px)] sm:pl-[calc(--spacing(3)-1px)] sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5"
				disabled={disabled}
				onChange={(event) => onChange(event.target.value as T)}
				value={value}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
				<svg
					aria-hidden="true"
					className="size-5 stroke-zinc-500 sm:size-4 dark:stroke-zinc-400"
					fill="none"
					viewBox="0 0 16 16"
				>
					<path
						d="M5.75 10.75L8 13L10.25 10.75"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
					/>
					<path
						d="M10.25 5.25L8 3L5.75 5.25"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
					/>
				</svg>
			</span>
		</span>
	);
}

function RepositoryTransferSettingsPanel({
	archiveState,
	hasPostTransferSettings,
	isRenamingRepositories,
	isTransferring,
	namePrefix,
	nameSuffix,
	onChangeArchiveState,
	onChangeNamePrefix,
	onChangeNameSuffix,
	onChangeVisibility,
	previewRepositoryName,
	previewTransferredRepositoryName,
	visibility,
}: Readonly<{
	archiveState: TransferRepositoryArchiveState;
	hasPostTransferSettings: boolean;
	isRenamingRepositories: boolean;
	isTransferring: boolean;
	namePrefix: string;
	nameSuffix: string;
	onChangeArchiveState: (value: TransferRepositoryArchiveState) => void;
	onChangeNamePrefix: (value: string) => void;
	onChangeNameSuffix: (value: string) => void;
	onChangeVisibility: (value: TransferRepositoryVisibility) => void;
	previewRepositoryName: string;
	previewTransferredRepositoryName: string;
	visibility: TransferRepositoryVisibility;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const hasActiveAdvancedOptions =
		isRenamingRepositories || hasPostTransferSettings;

	const handleToggle = (event: React.ToggleEvent<HTMLDetailsElement>): void => {
		setIsOpen(event.currentTarget.open);
	};

	return (
		<details
			className="group rounded-lg border border-zinc-950/10 dark:border-white/10"
			onToggle={handleToggle}
			open={isOpen}
		>
			<summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus:outline-2 focus:outline-blue-500 [&::-webkit-details-marker]:hidden">
				<span>
					<Strong>Advanced options</Strong>
					<Text className="mt-1">
						{hasActiveAdvancedOptions
							? getPostTransferSettingsSummary({
									archiveState,
									namePrefix,
									nameSuffix,
									visibility,
								})
							: "Rename repositories or change post-transfer settings."}
					</Text>
				</span>
				<ChevronDown className="size-4 shrink-0 text-zinc-500 group-open:rotate-180 dark:text-zinc-400" />
			</summary>
			<div className="border-zinc-950/10 border-t p-4 dark:border-white/10">
				<Fieldset>
					<FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Field>
							<Label>Name prefix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) => onChangeNamePrefix(event.target.value)}
								placeholder="archived-"
								value={namePrefix}
							/>
							<Description>
								Added before each selected repository name.
							</Description>
						</Field>
						<Field>
							<Label>Name suffix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) => onChangeNameSuffix(event.target.value)}
								placeholder="-migrated"
								value={nameSuffix}
							/>
							<Description>
								Added after each selected repository name.
							</Description>
						</Field>
						<Field>
							<Label>Visibility after transfer</Label>
							<RepositoryTransferSelect<TransferRepositoryVisibility>
								ariaLabel="Visibility after transfer"
								disabled={isTransferring}
								onChange={onChangeVisibility}
								options={REPOSITORY_VISIBILITY_OPTIONS}
								value={visibility}
							/>
							<Description>
								Applied after GitHub accepts the transfer.
							</Description>
						</Field>
						<Field>
							<Label>Archive state after transfer</Label>
							<RepositoryTransferSelect<TransferRepositoryArchiveState>
								ariaLabel="Archive state after transfer"
								disabled={isTransferring}
								onChange={onChangeArchiveState}
								options={REPOSITORY_ARCHIVE_STATE_OPTIONS}
								value={archiveState}
							/>
							<Description>
								Applied to each successfully transferred repository.
							</Description>
						</Field>
					</FieldGroup>
				</Fieldset>
				<Text className="mt-4">
					{hasActiveAdvancedOptions ? (
						<>
							Example transfer name: <Strong>{previewRepositoryName}</Strong> to{" "}
							<Strong>{previewTransferredRepositoryName}</Strong>. Settings:{" "}
							{getPostTransferSettingsSummary({
								archiveState,
								namePrefix,
								nameSuffix,
								visibility,
							})}
							.
						</>
					) : (
						"Repository names, visibility, and archive state will stay unchanged."
					)}
				</Text>
			</div>
		</details>
	);
}

function RepositoriesTable({
	filteredRepositories,
	isTransferring,
	onToggle,
	pendingRepositories,
	resultsByRepository,
	selectedRepositories,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	isTransferring: boolean;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	pendingRepositories: Set<string>;
	resultsByRepository: Map<string, TransferRepositoryResult>;
	selectedRepositories: Set<string>;
}>) {
	const checkboxShouldSelectRangeRef = useRef(false);

	const handleRowKeyDown = (
		event: KeyboardEvent<HTMLTableRowElement>,
		repositoryName: string
	): void => {
		if (event.target !== event.currentTarget) {
			return;
		}

		if (isTransferring) {
			return;
		}

		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onToggle(repositoryName, event.shiftKey);
		}
	};

	return (
		<div className="mb-32">
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader>Select</TableHeader>
						<TableHeader>Name</TableHeader>
						<TableHeader>Visibility</TableHeader>
						<TableHeader>Type</TableHeader>
						<TableHeader>Last pushed</TableHeader>
						<TableHeader>Status</TableHeader>
						<TableHeader>Actions</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{filteredRepositories.length > 0 ? (
						filteredRepositories.map((repository) => {
							const repositoryStatus = getRepositoryStatus(
								repository.name,
								pendingRepositories,
								resultsByRepository
							);

							return (
								<TableRow
									aria-selected={selectedRepositories.has(repository.name)}
									className="cursor-pointer hover:bg-zinc-100 focus:outline-2 focus:outline-blue-500 dark:hover:bg-zinc-800"
									key={repository.id}
									onClick={(event) => {
										if (!isTransferring) {
											onToggle(repository.name, event.shiftKey);
										}
									}}
									onKeyDown={(event) =>
										handleRowKeyDown(event, repository.name)
									}
									tabIndex={0}
								>
									<TableCell>
										<Checkbox
											aria-label={`Select ${repository.name}`}
											checked={selectedRepositories.has(repository.name)}
											className="group block size-4 rounded border bg-white data-checked:bg-zinc-500 data-disabled:opacity-50"
											disabled={isTransferring}
											onChange={() => {
												onToggle(
													repository.name,
													checkboxShouldSelectRangeRef.current
												);
												checkboxShouldSelectRangeRef.current = false;
											}}
											onClick={(event) => event.stopPropagation()}
											onPointerDown={(event) => {
												checkboxShouldSelectRangeRef.current = event.shiftKey;
											}}
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
									<TableCell>
										<div>
											<Strong>{repository.name}</Strong>
											<Text className="mt-1">{repository.fullName}</Text>
										</div>
									</TableCell>
									<TableCell>
										<RepositoryBadge>
											{repository.private ? "Private" : "Public"}
										</RepositoryBadge>
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											{repository.fork ? (
												<RepositoryBadge>Fork</RepositoryBadge>
											) : null}
											{repository.archived ? (
												<RepositoryBadge>Archived</RepositoryBadge>
											) : null}
											{repository.fork || repository.archived ? null : (
												<Text>Source</Text>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Text>{formatRepositoryPushedAt(repository.pushedAt)}</Text>
									</TableCell>
									<TableCell>
										<RepositoryStatusBadge status={repositoryStatus} />
									</TableCell>
									<TableCell>
										<Text>
											<TextLink
												href={repository.htmlUrl}
												onClick={(event) => event.stopPropagation()}
												rel="noopener noreferrer"
												target="_blank"
											>
												View on GitHub
											</TextLink>
										</Text>
									</TableCell>
								</TableRow>
							);
						})
					) : (
						<TableRow>
							<TableCell className="text-center" colSpan={7}>
								No repositories found.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function RepositoryBadge({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<span className="inline-flex rounded-md border border-zinc-950/10 px-2 py-1 font-medium text-xs text-zinc-700 dark:border-white/10 dark:text-zinc-300">
			{children}
		</span>
	);
}

function RepositoryStatusBadge({
	status,
}: Readonly<{
	status: RepositoryStatus;
}>) {
	if (status === "idle") {
		return <Text>Not queued</Text>;
	}

	const labelByStatus = {
		failed: "Failed",
		pending: "Pending",
		transferred: "Transferred",
	} as const;
	const classNameByStatus = {
		failed:
			"border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
		pending:
			"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
		transferred:
			"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
	} as const;

	return (
		<span
			className={`inline-flex rounded-md border px-2 py-1 font-medium text-xs ${classNameByStatus[status]}`}
		>
			{labelByStatus[status]}
		</span>
	);
}

function TransferActionBar({
	isTransferring,
	onReviewTransfer,
	selectedRepositoryCount,
}: Readonly<{
	isTransferring: boolean;
	onReviewTransfer: () => void;
	selectedRepositoryCount: number;
}>) {
	if (selectedRepositoryCount === 0) {
		return null;
	}

	return (
		<div className="fixed right-0 bottom-4 left-0 z-50 mx-auto max-w-md rounded-lg border border-zinc-950/10 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Text className="text-center sm:text-left">
					<Strong>{selectedRepositoryCount}</Strong>{" "}
					{selectedRepositoryCount === 1 ? "repository" : "repositories"}{" "}
					selected.
				</Text>
				<Button disabled={isTransferring} onClick={onReviewTransfer}>
					Review transfer
				</Button>
			</div>
		</div>
	);
}

function TransferReviewPanel({
	confirmationValue,
	from,
	isTransferring,
	onCancel,
	onChangeConfirmationValue,
	onConfirm,
	repositories,
	selectedRepositories,
	to,
	transferOptions,
}: Readonly<{
	confirmationValue: string;
	from: string;
	isTransferring: boolean;
	onCancel: () => void;
	onChangeConfirmationValue: (value: string) => void;
	onConfirm: () => void;
	repositories: GitHubRepository[];
	selectedRepositories: string[];
	to: string;
	transferOptions: RepositoryTransferOptions;
}>) {
	const selectedRepositorySet = new Set(selectedRepositories);
	const selectedRepositoryRows = repositories.filter((repository) =>
		selectedRepositorySet.has(repository.name)
	);
	const requiresConfirmation =
		selectedRepositories.length >= CONFIRMATION_REQUIRED_REPOSITORY_COUNT;
	const canConfirm =
		selectedRepositories.length > 0 &&
		!isTransferring &&
		(!requiresConfirmation || confirmationValue === to);

	return (
		<section className="fixed right-0 bottom-4 left-0 z-50 mx-auto max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-red-200 bg-red-50/95 p-4 shadow-lg backdrop-blur-md dark:border-red-500/30 dark:bg-zinc-950/95">
			<div className="flex items-start gap-3">
				<CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
				<div className="min-w-0 flex-1">
					<Strong>Review transfer</Strong>
					<Text className="mt-1">
						You are about to transfer {selectedRepositories.length}{" "}
						{selectedRepositories.length === 1 ? "repository" : "repositories"}{" "}
						from <Strong>{from}</Strong> to <Strong>{to}</Strong>.
					</Text>
					<Text className="mt-1">
						Post-transfer settings:{" "}
						{getPostTransferSettingsSummary(transferOptions)}.
					</Text>
					<div className="mt-4 max-h-52 overflow-y-auto rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-950">
						<ul className="divide-y divide-zinc-950/10 dark:divide-white/10">
							{selectedRepositoryRows.map((repository) => (
								<li className="px-3 py-2" key={repository.id}>
									<Strong>{repository.name}</Strong>
									<Text className="mt-1">
										{repository.fullName} to{" "}
										{getTransferredRepositoryName(
											repository.name,
											transferOptions
										)}
									</Text>
								</li>
							))}
						</ul>
					</div>
					{requiresConfirmation ? (
						<Field className="mt-4">
							<Label>Type {to} to confirm</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) =>
									onChangeConfirmationValue(event.target.value)
								}
								value={confirmationValue}
							/>
							<Description>
								This confirmation is required for transfers of{" "}
								{CONFIRMATION_REQUIRED_REPOSITORY_COUNT} or more repositories.
							</Description>
						</Field>
					) : null}
					<div className="mt-4 flex flex-wrap gap-2">
						<Button color="red" disabled={!canConfirm} onClick={onConfirm}>
							{isTransferring ? "Transferring..." : "Transfer repositories"}
						</Button>
						<Button disabled={isTransferring} onClick={onCancel} outline>
							Cancel
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

function TransferResultsPanel({
	onClearResults,
	onRetryFailedTransfers,
	results,
}: Readonly<{
	onClearResults: () => void;
	onRetryFailedTransfers: () => void;
	results: TransferRepositoryResult[];
}>) {
	const transferredCount = results.filter((result) => result.ok).length;
	const failedCount = results.length - transferredCount;
	const settingsFailedCount = getPostTransferSettingsFailureCount(results);

	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Strong>Transfer results</Strong>
					<Text className="mt-1">
						{results.length} requested, {transferredCount} transferred,{" "}
						{failedCount} failed
						{settingsFailedCount > 0
							? `, ${settingsFailedCount} ${
									settingsFailedCount === 1
										? "settings update"
										: "settings updates"
								} failed`
							: ""}
						.
					</Text>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={failedCount === 0}
						onClick={onRetryFailedTransfers}
						outline
					>
						<RefreshCcw data-slot="icon" />
						Retry failed
					</Button>
					<Button onClick={onClearResults} outline>
						Clear results
					</Button>
				</div>
			</div>
			<Divider className="my-4" />
			<Table dense>
				<TableHead>
					<TableRow>
						<TableHeader>Repository</TableHeader>
						<TableHeader>Result</TableHeader>
						<TableHeader>Details</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{results.map((result) => (
						<TableRow key={result.repository}>
							<TableCell>
								<div>
									<Strong>{result.repository}</Strong>
									{result.newName === result.repository ? null : (
										<Text className="mt-1">
											Transferred as {result.newName}
										</Text>
									)}
								</div>
							</TableCell>
							<TableCell>
								<span className="inline-flex items-center gap-2">
									{isTransferResultComplete(result) ? (
										<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
									) : (
										<CircleAlert className="size-4 text-red-600 dark:text-red-400" />
									)}
									{getTransferResultLabel(result)}
								</span>
							</TableCell>
							<TableCell>
								<Text>{getTransferResultDetails(result)}</Text>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}
