import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import PageHeading from "@/components/page-heading";
import { GitHubAccessGate } from "@/components/repositories/gate";
import {
	REPOSITORY_SORT_OPTIONS,
	type RepositorySort,
} from "@/components/repositories/list-types";
import { RepositoryPagination } from "@/components/repositories/pagination";
import { RepositorySelect } from "@/components/repositories/select";
import { useRepositoryList } from "@/components/repositories/use-repository-list";
import { Input, InputGroup } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryArchiveAction,
	ManageRepositoryResult,
	ManageRepositorySubscriptionAction,
	ManageRepositoryVisibilityAction,
} from "@/github";
import type {
	ManagePageData,
	ManageRepositoriesResult,
	ManageRepositoryChangeInput,
	ManageWatchedRepositoriesResult,
} from "@/server-functions";
import { AccountManagePanel } from "./account-manage-panel";
import { ManageActionBar } from "./manage-action-bar";
import { ManageEditDialog } from "./manage-edit-dialog";
import { ManageResultsPanel } from "./manage-results-panel";
import { ManageStartState } from "./manage-start-state";
import { RepositoriesTable } from "./repositories-table";
import { getManageResultDetails, showManageResultToast } from "./utils";

const MANAGE_CHUNK_SIZE = 10;

const chunkManageChanges = (
	changes: ManageRepositoryChangeInput[]
): ManageRepositoryChangeInput[][] => {
	const chunks: ManageRepositoryChangeInput[][] = [];

	for (
		let startIndex = 0;
		startIndex < changes.length;
		startIndex += MANAGE_CHUNK_SIZE
	) {
		chunks.push(changes.slice(startIndex, startIndex + MANAGE_CHUNK_SIZE));
	}

	return chunks;
};

export function ManagePageContent({
	account,
	hasGitHubAccess,
	isLoadingManageData,
	isSignedIn,
	onLoadWatchedRepositories,
	onManageChunk,
	onResetFlow,
	onRunComplete,
	onSelectAccount,
	pageData,
}: Readonly<{
	account?: string;
	hasGitHubAccess: boolean;
	isLoadingManageData: boolean;
	isSignedIn: boolean;
	onLoadWatchedRepositories: () => Promise<ManageWatchedRepositoriesResult>;
	onManageChunk: (
		changes: ManageRepositoryChangeInput[]
	) => Promise<ManageRepositoriesResult>;
	onResetFlow: () => void;
	onRunComplete: (didChangeAnything: boolean) => Promise<void>;
	onSelectAccount: (accountHandle: string) => void;
	pageData: ManagePageData;
}>) {
	const [archiveAction, setArchiveAction] =
		useState<ManageRepositoryArchiveAction>("current");
	const [subscriptionAction, setSubscriptionAction] =
		useState<ManageRepositorySubscriptionAction>("current");
	const [visibilityAction, setVisibilityAction] =
		useState<ManageRepositoryVisibilityAction>("current");
	const [confirmationValue, setConfirmationValue] = useState("");
	const [editTargets, setEditTargets] = useState<string[] | null>(null);
	const [isManaging, setIsManaging] = useState(false);
	const [lastRunActions, setLastRunActions] =
		useState<ManageRepositoryActions | null>(null);
	const [manageResults, setManageResults] = useState<
		ManageRepositoryResult[] | null
	>(null);
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);
	const [singleEditRepositories, setSingleEditRepositories] = useState<
		string[]
	>([]);
	const [inlineResults, setInlineResults] = useState<
		Map<string, ManageRepositoryResult>
	>(new Map());
	const [watchedRepositorySet, setWatchedRepositorySet] =
		useState<Set<string> | null>(null);
	const [watchedRefreshKey, setWatchedRefreshKey] = useState(0);
	const closingEditTargetsRef = useRef<GitHubRepository[]>([]);

	const repositories = useMemo(
		() => pageData.repositories ?? [],
		[pageData.repositories]
	);
	const {
		currentPage,
		filteredRepositories,
		pageCount,
		pageEndIndex,
		pageStartIndex,
		paginatedRepositories,
		repositoriesPerPage,
		repositorySearch,
		repositorySort,
		resetList,
		selectedRepositories,
		setSelectedRepositories,
		toggleRepository,
		updatePage,
		updateRepositoriesPerPage,
		updateSearch,
		updateSort,
	} = useRepositoryList(repositories);

	const actions = useMemo<ManageRepositoryActions>(
		() => ({
			archiveAction,
			subscriptionAction,
			visibilityAction,
		}),
		[archiveAction, subscriptionAction, visibilityAction]
	);
	const editTargetRepositories = useMemo(() => {
		if (!editTargets) {
			return [];
		}

		const editTargetSet = new Set(editTargets);

		return repositories.filter((repository) =>
			editTargetSet.has(repository.name)
		);
	}, [editTargets, repositories]);

	if (editTargetRepositories.length > 0) {
		// Keep the closing dialog readable while it fades out.
		closingEditTargetsRef.current = editTargetRepositories;
	}

	const pendingRepositorySet = useMemo(
		() => new Set([...pendingRepositories, ...singleEditRepositories]),
		[pendingRepositories, singleEditRepositories]
	);
	const selectedRepositorySet = useMemo(
		() => new Set(selectedRepositories),
		[selectedRepositories]
	);
	const resultsByRepository = useMemo(() => {
		const mergedResults = new Map(inlineResults);

		for (const result of manageResults ?? []) {
			mergedResults.set(result.repository, result);
		}

		return mergedResults;
	}, [inlineResults, manageResults]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local flow state when the selected account changes.
	useEffect(() => {
		setArchiveAction("current");
		setSubscriptionAction("current");
		setVisibilityAction("current");
		setConfirmationValue("");
		setEditTargets(null);
		setLastRunActions(null);
		setManageResults(null);
		setPendingRepositories([]);
		setSingleEditRepositories([]);
		setInlineResults(new Map());
		setWatchedRepositorySet(null);
		resetList();
	}, [account]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: the loader prop is inline and would restart the fetch on every render.
	useEffect(() => {
		if (!account) {
			return;
		}

		let isCurrentAccount = true;

		const loadWatchedRepositories = async (): Promise<void> => {
			const result = await onLoadWatchedRepositories();

			if (isCurrentAccount && result.watchedRepositories) {
				setWatchedRepositorySet(new Set(result.watchedRepositories));
			}
		};

		loadWatchedRepositories().catch(() => {
			// The notification column stays unknown when the sweep fails.
		});

		return () => {
			isCurrentAccount = false;
		};
	}, [account, watchedRefreshKey]);

	// The three actions and the confirmation reset when the dialog opens, so
	// closing leaves the dialog contents alone while it fades out.
	const closeEditDialog = (): void => {
		setEditTargets(null);
	};

	const openEditDialog = (repositoryNames: string[]): void => {
		setArchiveAction("current");
		setSubscriptionAction("current");
		setVisibilityAction("current");
		setConfirmationValue("");
		setEditTargets(repositoryNames);
	};

	const retryFailedRepositories = (): void => {
		const failedRepositories = (manageResults ?? [])
			.filter((result) => !result.ok)
			.map((result) => result.repository);

		if (failedRepositories.length === 0) {
			return;
		}

		setArchiveAction(lastRunActions?.archiveAction ?? "current");
		setSubscriptionAction(lastRunActions?.subscriptionAction ?? "current");
		setVisibilityAction(lastRunActions?.visibilityAction ?? "current");
		setConfirmationValue("");
		setEditTargets(failedRepositories);
	};

	const buildChangeInputs = (): ManageRepositoryChangeInput[] =>
		(editTargets ?? []).map((repository) => {
			const changeInput: ManageRepositoryChangeInput = { repository };

			if (archiveAction !== "current") {
				changeInput.archiveAction = archiveAction;
			}

			if (subscriptionAction !== "current") {
				changeInput.subscriptionAction = subscriptionAction;
			}

			if (visibilityAction !== "current") {
				changeInput.visibilityAction = visibilityAction;
			}

			return changeInput;
		});

	const refreshWatchedRepositories = (
		results: ManageRepositoryResult[]
	): void => {
		if (results.some((result) => result.subscription !== null)) {
			setWatchedRefreshKey((previousKey) => previousKey + 1);
		}
	};

	const runSingleChange = async (
		change: ManageRepositoryChangeInput
	): Promise<void> => {
		setSingleEditRepositories((previous) => [...previous, change.repository]);
		setInlineResults((previous) => {
			const next = new Map(previous);
			next.delete(change.repository);

			return next;
		});

		try {
			const result = await onManageChunk([change]);
			const repositoryResult = result.results?.[0];

			if (!repositoryResult) {
				toast.error(result.error ?? "Failed to update the repository.");
				return;
			}

			setInlineResults((previous) =>
				new Map(previous).set(change.repository, repositoryResult)
			);
			refreshWatchedRepositories([repositoryResult]);

			if (repositoryResult.ok) {
				await onRunComplete(true);
			} else {
				toast.error(getManageResultDetails(repositoryResult));
			}
		} finally {
			setSingleEditRepositories((previous) =>
				previous.filter((name) => name !== change.repository)
			);
		}
	};

	const handleManage = async (): Promise<void> => {
		const changeInputs = buildChangeInputs();
		const hasChosenAction =
			archiveAction !== "current" ||
			subscriptionAction !== "current" ||
			visibilityAction !== "current";

		if (changeInputs.length === 0 || !hasChosenAction) {
			return;
		}

		setLastRunActions(actions);
		closeEditDialog();
		setIsManaging(true);
		setManageResults(null);
		setInlineResults(new Map());
		setPendingRepositories(changeInputs.map((change) => change.repository));

		const collectedResults: ManageRepositoryResult[] = [];
		let runError: string | null = null;

		try {
			for (const chunk of chunkManageChanges(changeInputs)) {
				// biome-ignore lint/performance/noAwaitInLoops: chunks run sequentially to stay inside Workers subrequest limits
				const chunkResult = await onManageChunk(chunk);

				if (!chunkResult.results) {
					runError = chunkResult.error ?? "Failed to update repositories.";
					break;
				}

				const chunkRepositories = new Set(
					chunk.map((change) => change.repository)
				);

				collectedResults.push(...chunkResult.results);
				setManageResults([...collectedResults]);
				setPendingRepositories((previousPending) =>
					previousPending.filter((name) => !chunkRepositories.has(name))
				);
			}
		} finally {
			setPendingRepositories([]);
			setIsManaging(false);
		}

		showManageResultToast(collectedResults, runError);
		refreshWatchedRepositories(collectedResults);
		await onRunComplete(
			collectedResults.some((result) =>
				[result.archive, result.subscription, result.visibility].some(
					(settingResult) => settingResult?.outcome === "changed"
				)
			)
		);
	};

	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="Archive, change visibility, and set notification levels for many repositories at once."
				title="Bulk Manage Repositories"
			/>
			<GitHubAccessGate
				hasGitHubAccess={hasGitHubAccess}
				isSignedIn={isSignedIn}
			>
				<div className="space-y-8">
					<AccountManagePanel
						account={account}
						accounts={pageData.organizations}
						isLoading={isLoadingManageData}
						onReset={onResetFlow}
						onSelectAccount={onSelectAccount}
					/>
					{account && !isLoadingManageData ? (
						<section className="space-y-6">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<Text>
									Select repositories in <Strong>{account}</Strong>, then edit
									their settings.
								</Text>
								<div className="grid gap-3 sm:min-w-lg sm:grid-cols-[minmax(0,1fr)_12rem]">
									<InputGroup>
										<MagnifyingGlassIcon />
										<Input
											aria-label="Search repositories"
											onChange={(event) => updateSearch(event.target.value)}
											placeholder="Search repositories"
											type="search"
											value={repositorySearch}
										/>
									</InputGroup>
									<RepositorySelect<RepositorySort>
										ariaLabel="Sort repositories"
										className="mt-0"
										disabled={isManaging}
										onChange={updateSort}
										options={REPOSITORY_SORT_OPTIONS}
										value={repositorySort}
									/>
								</div>
							</div>
							<div className="mb-32 space-y-4">
								<RepositoriesTable
									filteredRepositories={paginatedRepositories}
									isManaging={isManaging}
									onApplyChange={runSingleChange}
									onEditRepository={(repositoryName) =>
										openEditDialog([repositoryName])
									}
									onToggle={toggleRepository}
									pendingRepositories={pendingRepositorySet}
									resultsByRepository={resultsByRepository}
									selectedRepositories={selectedRepositorySet}
									supportsInternalVisibility={
										pageData.supportsInternalVisibility
									}
									watchedRepositories={watchedRepositorySet}
								/>
								<RepositoryPagination
									currentPage={currentPage}
									onChangePage={updatePage}
									onChangePageSize={updateRepositoriesPerPage}
									pageCount={pageCount}
									pageSize={repositoriesPerPage}
									totalRepositoryCount={filteredRepositories.length}
									visibleEndIndex={pageEndIndex}
									visibleStartIndex={pageStartIndex}
								/>
							</div>
							{manageResults ? (
								<ManageResultsPanel
									onClearResults={() => setManageResults(null)}
									onRetryFailed={retryFailedRepositories}
									results={manageResults}
								/>
							) : null}
							<ManageActionBar
								isManaging={isManaging}
								managingRepositoryCount={
									pendingRepositories.length + (manageResults?.length ?? 0)
								}
								onClearSelection={() => setSelectedRepositories([])}
								onEditSettings={() => openEditDialog(selectedRepositories)}
								selectedRepositoryCount={selectedRepositories.length}
							/>
							<ManageEditDialog
								account={account}
								actions={actions}
								confirmationValue={confirmationValue}
								isManaging={isManaging}
								onCancel={closeEditDialog}
								onChangeArchiveAction={setArchiveAction}
								onChangeConfirmationValue={setConfirmationValue}
								onChangeSubscriptionAction={setSubscriptionAction}
								onChangeVisibilityAction={setVisibilityAction}
								onConfirm={handleManage}
								open={editTargets !== null}
								repositories={
									editTargets === null
										? closingEditTargetsRef.current
										: editTargetRepositories
								}
								supportsInternalVisibility={pageData.supportsInternalVisibility}
								watchedRepositories={watchedRepositorySet}
							/>
						</section>
					) : (
						<ManageStartState isLoading={isLoadingManageData} />
					)}
				</div>
			</GitHubAccessGate>
		</div>
	);
}
