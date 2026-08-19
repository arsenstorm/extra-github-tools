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
	ManageRepositoryActions,
	ManageRepositoryArchiveAction,
	ManageRepositoryResult,
	ManageRepositorySubscriptionAction,
	ManageRepositoryVisibilityAction,
} from "@/github";
import type {
	ManagePageData,
	ManageRepositoriesResult,
} from "@/server-functions";
import { AccountManagePanel } from "./account-manage-panel";
import { ManageActionBar } from "./manage-action-bar";
import { ManageResultsPanel } from "./manage-results-panel";
import { ManageReviewPanel } from "./manage-review-panel";
import { ManageSettingsPanel } from "./manage-settings-panel";
import { ManageStartState } from "./manage-start-state";
import { RepositoriesTable } from "./repositories-table";
import { hasManageAction, showManageResultToast } from "./utils";

const MANAGE_CHUNK_SIZE = 10;

const chunkRepositoryNames = (repositoryNames: string[]): string[][] => {
	const chunks: string[][] = [];

	for (
		let startIndex = 0;
		startIndex < repositoryNames.length;
		startIndex += MANAGE_CHUNK_SIZE
	) {
		chunks.push(
			repositoryNames.slice(startIndex, startIndex + MANAGE_CHUNK_SIZE)
		);
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
		repositoryNames: string[],
		actions: ManageRepositoryActions
	) => Promise<ManageRepositoriesResult>;
	onResetFlow: () => void;
	onRunComplete: (didChangeAnything: boolean) => Promise<void>;
	onSelectAccount: (accountHandle: string) => void;
	pageData: ManagePageData;
}>) {
	const [archiveAction, setArchiveAction] =
		useState<ManageRepositoryArchiveAction>("current");
	const [confirmationValue, setConfirmationValue] = useState("");
	const [isManaging, setIsManaging] = useState(false);
	const [isReviewing, setIsReviewing] = useState(false);
	const [manageResults, setManageResults] = useState<
		ManageRepositoryResult[] | null
	>(null);
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);
	const [subscriptionAction, setSubscriptionAction] =
		useState<ManageRepositorySubscriptionAction>("current");
	const [visibilityAction, setVisibilityAction] =
		useState<ManageRepositoryVisibilityAction>("current");

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
		setSelectedRepositories,
		toggleRepository,
		updatePage,
		updateRepositoriesPerPage,
		updateSearch,
		updateSort,
	} = useRepositoryList(repositories);

	const manageActions = useMemo<ManageRepositoryActions>(
		() => ({
			archiveAction,
			subscriptionAction,
			visibilityAction,
		}),
		[archiveAction, subscriptionAction, visibilityAction]
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
	const hasAction = hasManageAction(manageActions);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset local flow state when the selected account changes.
	useEffect(() => {
		setArchiveAction("current");
		setConfirmationValue("");
		setIsReviewing(false);
		setManageResults(null);
		setPendingRepositories([]);
		setSubscriptionAction("current");
		setVisibilityAction("current");
		resetList();
	}, [account]);

	const handleToggleRepository = (
		repositoryName: string,
		shouldSelectRange = false
	): void => {
		setConfirmationValue("");
		setIsReviewing(false);
		setManageResults(null);
		toggleRepository(repositoryName, shouldSelectRange);
	};

	const handleManage = async (): Promise<void> => {
		setIsManaging(true);
		setManageResults(null);
		setPendingRepositories(selectedRepositories);

		const collectedResults: ManageRepositoryResult[] = [];
		let runError: string | null = null;

		try {
			for (const chunk of chunkRepositoryNames(selectedRepositories)) {
				// biome-ignore lint/performance/noAwaitInLoops: chunks run sequentially to stay inside Workers subrequest limits
				const chunkResult = await onManageChunk(chunk, manageActions);

				if (!chunkResult.results) {
					runError = chunkResult.error ?? "Failed to update repositories.";
					break;
				}

				collectedResults.push(...chunkResult.results);
				setManageResults([...collectedResults]);
				setPendingRepositories((previousPending) =>
					previousPending.filter((name) => !chunk.includes(name))
				);
			}
		} finally {
			setPendingRepositories([]);
			setIsManaging(false);
		}

		setIsReviewing(false);
		setConfirmationValue("");

		const processedRepositories = new Set(
			collectedResults.map((result) => result.repository)
		);

		setSelectedRepositories([
			...collectedResults
				.filter((result) => !result.ok)
				.map((result) => result.repository),
			...selectedRepositories.filter(
				(repositoryName) => !processedRepositories.has(repositoryName)
			),
		]);
		showManageResultToast(collectedResults, runError);
		await onRunComplete(
			collectedResults.some((result) =>
				[result.archive, result.subscription, result.visibility].some(
					(settingResult) => settingResult?.outcome === "changed"
				)
			)
		);
	};

	const retryFailedUpdates = (): void => {
		if (!manageResults) {
			return;
		}

		setSelectedRepositories(
			manageResults
				.filter((result) => !result.ok)
				.map((result) => result.repository)
		);
		setConfirmationValue("");
		setIsReviewing(true);
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
								actions={manageActions}
								isManaging={isManaging}
								onChangeArchiveAction={setArchiveAction}
								onChangeSubscriptionAction={setSubscriptionAction}
								onChangeVisibilityAction={setVisibilityAction}
							/>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<Text>
									Select repositories in <Strong>{account}</Strong> to update.
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
									onToggle={handleToggleRepository}
									pendingRepositories={pendingRepositorySet}
									resultsByRepository={resultsByRepository}
									selectedRepositories={selectedRepositorySet}
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
									onRetryFailed={retryFailedUpdates}
									results={manageResults}
								/>
							) : null}
							{isReviewing ? (
								<ManageReviewPanel
									account={account}
									actions={manageActions}
									confirmationValue={confirmationValue}
									isManaging={isManaging}
									onCancel={() => {
										setConfirmationValue("");
										setIsReviewing(false);
									}}
									onChangeConfirmationValue={setConfirmationValue}
									onConfirm={handleManage}
									repositories={repositories}
									selectedRepositories={selectedRepositories}
									watchedRepositories={watchedRepositorySet}
								/>
							) : (
								<ManageActionBar
									hasAction={hasAction}
									isManaging={isManaging}
									onReviewChanges={() => {
										setManageResults(null);
										setIsReviewing(true);
									}}
									selectedRepositoryCount={selectedRepositories.length}
								/>
							)}
						</section>
					) : (
						<ManageStartState isLoading={isLoadingManageData} />
					)}
				</div>
			</GitHubAccessGate>
		</div>
	);
}
