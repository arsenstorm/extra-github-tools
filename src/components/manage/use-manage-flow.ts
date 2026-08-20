import { useCallback, useMemo, useState } from "react";
import { getFailedRepositoryNames } from "@/components/repositories/list-utils";
import {
	type RepositoryListState,
	useRepositoryList,
} from "@/components/repositories/use-repository-list";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryResult,
} from "@/github/types";
import type {
	ManageRepositoriesResult,
	ManageRepositoryChangeInput,
} from "@/server-functions";
import { DEFAULT_MANAGE_ACTIONS } from "./types";
import {
	createManageChangeInput,
	hasChangedSetting,
	hasManageAction,
	type StagedChanges,
	showManageResultToast,
	stageChanges,
} from "./utils";

const MANAGE_CHUNK_SIZE = 10;
const EMPTY_STAGED_CHANGES: StagedChanges = new Map();

const chunk = <Item>(items: Item[], size: number): Item[][] => {
	const chunks: Item[][] = [];

	for (let startIndex = 0; startIndex < items.length; startIndex += size) {
		chunks.push(items.slice(startIndex, startIndex + size));
	}

	return chunks;
};

interface ChunkedRun {
	error: string | null;
	results: ManageRepositoryResult[];
}

export interface ManageFlow {
	/** Actions picked in the bulk edit form. */
	bulkActions: ManageRepositoryActions;
	/** Repositories the bulk edit form applies to. */
	bulkEditRepositories: GitHubRepository[];
	closeBulkEdit: () => void;
	closeReview: () => void;
	confirmationValue: string;
	discardChanges: () => void;
	isBulkEditOpen: boolean;
	isManaging: boolean;
	isReviewing: boolean;
	list: RepositoryListState;
	manageResults: ManageRepositoryResult[] | null;
	managingRepositoryCount: number;
	openBulkEdit: (repositoryNames: string[]) => void;
	openReview: () => void;
	pendingRepositories: Set<string>;
	resultsByRepository: Map<string, ManageRepositoryResult>;
	retryFailedRepositories: () => void;
	runStagedChanges: () => Promise<void>;
	setBulkActions: (actions: ManageRepositoryActions) => void;
	setConfirmationValue: (value: string) => void;
	setManageResults: (results: ManageRepositoryResult[] | null) => void;
	/** Stages the bulk form's actions for its repositories and closes the form. */
	stageBulkEdit: () => void;
	/** Stages one setting change for a repository; picking its current value unstages it. */
	stageChange: (
		repositoryName: string,
		change: Partial<ManageRepositoryActions>
	) => void;
	stagedChanges: StagedChanges;
	/** Staged repositories in list order, for the review dialog. */
	stagedRepositories: GitHubRepository[];
	unstageRepository: (repositoryName: string) => void;
}

export function useManageFlow({
	expectedRepositoryCount,
	onManageChunk,
	onRunComplete,
	repositories,
}: Readonly<{
	expectedRepositoryCount: number;
	onManageChunk: (
		changes: ManageRepositoryChangeInput[]
	) => Promise<ManageRepositoriesResult>;
	onRunComplete: (didChangeAnything: boolean) => Promise<void>;
	repositories: GitHubRepository[];
}>): ManageFlow {
	const list = useRepositoryList(repositories, {
		expectedCount: expectedRepositoryCount,
	});
	const [stagedChanges, setStagedChanges] =
		useState<StagedChanges>(EMPTY_STAGED_CHANGES);
	const [bulkActions, setBulkActions] = useState<ManageRepositoryActions>(
		DEFAULT_MANAGE_ACTIONS
	);
	const [bulkEditTargets, setBulkEditTargets] = useState<string[] | null>(null);
	const [confirmationValue, setConfirmationValue] = useState("");
	const [isManaging, setIsManaging] = useState(false);
	const [isReviewing, setIsReviewing] = useState(false);
	const [lastRunChanges, setLastRunChanges] =
		useState<StagedChanges>(EMPTY_STAGED_CHANGES);
	const [manageResults, setManageResults] = useState<
		ManageRepositoryResult[] | null
	>(null);
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);

	const repositoriesByName = useMemo(
		() =>
			new Map(repositories.map((repository) => [repository.name, repository])),
		[repositories]
	);
	const stagedRepositories = useMemo(
		() =>
			repositories.filter((repository) => stagedChanges.has(repository.name)),
		[repositories, stagedChanges]
	);
	const bulkEditRepositories = useMemo(
		() =>
			(bulkEditTargets ?? [])
				.map((name) => repositoriesByName.get(name))
				.filter((repository) => repository !== undefined),
		[bulkEditTargets, repositoriesByName]
	);
	const pendingRepositorySet = useMemo(
		() => new Set(pendingRepositories),
		[pendingRepositories]
	);
	const resultsByRepository = useMemo(
		() =>
			new Map(
				(manageResults ?? []).map((result) => [result.repository, result])
			),
		[manageResults]
	);

	const stageChange = useCallback(
		(repositoryName: string, change: Partial<ManageRepositoryActions>) => {
			const repository = repositoriesByName.get(repositoryName);

			if (!repository) {
				return;
			}

			setManageResults(null);
			setStagedChanges((previous) =>
				stageChanges(previous, [repository], change)
			);
		},
		[repositoriesByName]
	);

	const unstageRepository = (repositoryName: string): void => {
		setStagedChanges((previous) => {
			const next = new Map(previous);

			next.delete(repositoryName);

			return next;
		});
	};

	const discardChanges = (): void => {
		setStagedChanges(EMPTY_STAGED_CHANGES);
		setIsReviewing(false);
	};

	const openBulkEdit = useCallback((targetNames: string[]): void => {
		setBulkActions(DEFAULT_MANAGE_ACTIONS);
		setBulkEditTargets(targetNames);
	}, []);

	const stageBulkEdit = (): void => {
		if (!hasManageAction(bulkActions)) {
			return;
		}

		setManageResults(null);
		setStagedChanges((previous) =>
			stageChanges(previous, bulkEditRepositories, bulkActions)
		);
		setBulkEditTargets(null);
	};

	const openReview = (): void => {
		setConfirmationValue("");
		setIsReviewing(true);
	};

	const retryFailedRepositories = (): void => {
		const failedNames = getFailedRepositoryNames(manageResults);

		setStagedChanges((previous) => {
			const next = new Map(previous);

			for (const name of failedNames) {
				const actions = lastRunChanges.get(name);

				if (actions) {
					next.set(name, actions);
				}
			}

			return next;
		});
		openReview();
	};

	const runChunks = async (
		changeInputs: ManageRepositoryChangeInput[]
	): Promise<ChunkedRun> => {
		const results: ManageRepositoryResult[] = [];

		for (const changeChunk of chunk(changeInputs, MANAGE_CHUNK_SIZE)) {
			// biome-ignore lint/performance/noAwaitInLoops: chunks run sequentially to stay inside Workers subrequest limits
			const chunkResult = await onManageChunk(changeChunk);

			if (!chunkResult.results) {
				return {
					error: chunkResult.error ?? "Failed to update repositories.",
					results,
				};
			}

			const chunkRepositories = new Set(
				changeChunk.map((change) => change.repository)
			);

			results.push(...chunkResult.results);
			setManageResults([...results]);
			setPendingRepositories((previousPending) =>
				previousPending.filter((name) => !chunkRepositories.has(name))
			);
		}

		return { error: null, results };
	};

	const runStagedChanges = async (): Promise<void> => {
		const changeInputs = stagedRepositories.map((repository) =>
			createManageChangeInput(
				repository.name,
				stagedChanges.get(repository.name) ?? DEFAULT_MANAGE_ACTIONS
			)
		);

		if (changeInputs.length === 0) {
			return;
		}

		setLastRunChanges(stagedChanges);
		setStagedChanges(EMPTY_STAGED_CHANGES);
		setIsReviewing(false);
		setIsManaging(true);
		setManageResults(null);
		setPendingRepositories(changeInputs.map((change) => change.repository));

		let run: ChunkedRun;

		try {
			run = await runChunks(changeInputs);
		} finally {
			setPendingRepositories([]);
			setIsManaging(false);
		}

		showManageResultToast(run.results, run.error);
		await onRunComplete(run.results.some(hasChangedSetting));
	};

	return {
		bulkActions,
		bulkEditRepositories,
		closeBulkEdit: () => setBulkEditTargets(null),
		closeReview: () => setIsReviewing(false),
		confirmationValue,
		discardChanges,
		isBulkEditOpen: bulkEditTargets !== null,
		isManaging,
		isReviewing,
		list,
		manageResults,
		managingRepositoryCount:
			pendingRepositories.length + (manageResults?.length ?? 0),
		openBulkEdit,
		openReview,
		pendingRepositories: pendingRepositorySet,
		resultsByRepository,
		retryFailedRepositories,
		runStagedChanges,
		setBulkActions,
		setConfirmationValue,
		setManageResults,
		stageBulkEdit,
		stageChange,
		stagedChanges,
		stagedRepositories,
		unstageRepository,
	};
}
