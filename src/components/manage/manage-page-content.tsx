import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { useEffect, useMemo, useState } from "react";
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
	ManageRepositoryArchiveAction,
	ManageRepositoryResult,
	ManageRepositorySubscriptionAction,
	ManageRepositoryVisibilityAction,
} from "@/github";
import type {
	ManagePageData,
	ManageRepositoriesResult,
	ManageRepositoryChangeInput,
} from "@/server-functions";
import { AccountManagePanel } from "./account-manage-panel";
import { ManageActionBar } from "./manage-action-bar";
import { ManageConfirmDialog } from "./manage-confirm-dialog";
import { ManageResultsPanel } from "./manage-results-panel";
import { ManageSettingsPanel } from "./manage-settings-panel";
import { ManageStartState } from "./manage-start-state";
import { RepositoriesTable } from "./repositories-table";
import {
	getBulkPendingChange,
	getManageChangeInputs,
	type RepositoryPendingChange,
	showManageResultToast,
	withPendingField,
} from "./utils";

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
	onManageChunk: (
		changes: ManageRepositoryChangeInput[]
	) => Promise<ManageRepositoriesResult>;
	onResetFlow: () => void;
	onRunComplete: (didChangeAnything: boolean) => Promise<void>;
	onSelectAccount: (accountHandle: string) => void;
	pageData: ManagePageData;
}>) {
	const [bulkArchiveAction, setBulkArchiveAction] =
		useState<ManageRepositoryArchiveAction>("current");
	const [bulkSubscriptionAction, setBulkSubscriptionAction] =
		useState<ManageRepositorySubscriptionAction>("current");
	const [bulkVisibilityAction, setBulkVisibilityAction] =
		useState<ManageRepositoryVisibilityAction>("current");
	const [confirmationValue, setConfirmationValue] = useState("");
	const [isConfirming, setIsConfirming] = useState(false);
	const [isManaging, setIsManaging] = useState(false);
	const [manageResults, setManageResults] = useState<
		ManageRepositoryResult[] | null
	>(null);
	const [pendingChanges, setPendingChanges] = useState<
		Map<string, RepositoryPendingChange>
	>(new Map());
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);

	const repositories = useMemo(
		() => pageData.repositories ?? [],
		[pageData.repositories]
	);
	const watchedRepositorySet = useMemo(
		() => new Set(pageData.watchedRepositories ?? []),
		[pageData.watchedRepositories]
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
		toggleRepository,
		updatePage,
		updateRepositoriesPerPage,
		updateSearch,
		updateSort,
	} = useRepositoryList(repositories);

	const bulkActions = useMemo(
		() => ({
			archiveAction: bulkArchiveAction,
			subscriptionAction: bulkSubscriptionAction,
			visibilityAction: bulkVisibilityAction,
		}),
		[bulkArchiveAction, bulkSubscriptionAction, bulkVisibilityAction]
	);
	const pendingRepositorySet = useMemo(
		() => new Set(pendingRepositories),
		[pendingRepositories]
	);
	const selectedRepositorySet = useMemo(
		() => new Set(selectedRepositories),
		[selectedRepositories]
	);
	const resultsByRepository = useMemo(
		() =>
			new Map(
				manageResults?.map((result) => [result.repository, result]) ?? []
			),
		[manageResults]
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local flow state when the selected account changes.
	useEffect(() => {
		setBulkArchiveAction("current");
		setBulkSubscriptionAction("current");
		setBulkVisibilityAction("current");
		setConfirmationValue("");
		setIsConfirming(false);
		setManageResults(null);
		setPendingChanges(new Map());
		setPendingRepositories([]);
		resetList();
	}, [account]);

	const setRepositoryPendingField = <
		Field extends keyof RepositoryPendingChange,
	>(
		repositoryName: string,
		field: Field,
		target: RepositoryPendingChange[Field],
		currentValue: RepositoryPendingChange[Field]
	): void => {
		setManageResults(null);
		setPendingChanges((previous) => {
			const next = new Map(previous);
			const updated = withPendingField(
				next.get(repositoryName),
				field,
				target,
				currentValue
			);

			if (updated) {
				next.set(repositoryName, updated);
			} else {
				next.delete(repositoryName);
			}

			return next;
		});
	};

	const applyBulkActionsToSelection = (): void => {
		setManageResults(null);
		setPendingChanges((previous) => {
			const next = new Map(previous);

			for (const repository of repositories) {
				if (!selectedRepositorySet.has(repository.name)) {
					continue;
				}

				const updated = getBulkPendingChange(
					repository,
					next.get(repository.name),
					bulkActions,
					watchedRepositorySet
				);

				if (updated) {
					next.set(repository.name, updated);
				} else {
					next.delete(repository.name);
				}
			}

			return next;
		});
		setBulkArchiveAction("current");
		setBulkSubscriptionAction("current");
		setBulkVisibilityAction("current");
	};

	const discardPendingChanges = (): void => {
		setConfirmationValue("");
		setIsConfirming(false);
		setPendingChanges(new Map());
	};

	const handleManage = async (): Promise<void> => {
		const changeInputs = getManageChangeInputs(pendingChanges);

		if (changeInputs.length === 0) {
			return;
		}

		setConfirmationValue("");
		setIsConfirming(false);
		setIsManaging(true);
		setManageResults(null);
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

		setPendingChanges((previous) => {
			const next = new Map(previous);

			for (const result of collectedResults) {
				if (result.ok) {
					next.delete(result.repository);
				}
			}

			return next;
		});
		showManageResultToast(collectedResults, runError);
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
							<ManageSettingsPanel
								actions={bulkActions}
								isManaging={isManaging}
								onApplyToSelection={applyBulkActionsToSelection}
								onChangeArchiveAction={setBulkArchiveAction}
								onChangeSubscriptionAction={setBulkSubscriptionAction}
								onChangeVisibilityAction={setBulkVisibilityAction}
								selectedRepositoryCount={selectedRepositories.length}
								supportsInternalVisibility={pageData.supportsInternalVisibility}
							/>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<Text>
									Edit repositories in <Strong>{account}</Strong> row by row, or
									select rows to bulk edit.
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
									onStagePendingField={setRepositoryPendingField}
									onToggle={toggleRepository}
									pendingChanges={pendingChanges}
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
									onRetryFailed={() => {
										setConfirmationValue("");
										setIsConfirming(true);
									}}
									results={manageResults}
								/>
							) : null}
							<ManageActionBar
								isManaging={isManaging}
								onDiscard={discardPendingChanges}
								onReviewChanges={() => {
									setConfirmationValue("");
									setIsConfirming(true);
								}}
								pendingChangeCount={pendingChanges.size}
							/>
							<ManageConfirmDialog
								account={account}
								confirmationValue={confirmationValue}
								isManaging={isManaging}
								onCancel={() => {
									setConfirmationValue("");
									setIsConfirming(false);
								}}
								onChangeConfirmationValue={setConfirmationValue}
								onConfirm={handleManage}
								open={isConfirming}
								pendingChanges={pendingChanges}
								repositories={repositories}
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
