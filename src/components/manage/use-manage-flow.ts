import { useCallback, useMemo, useRef, useState } from "react";
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
	showManageResultToast,
} from "./utils";

const MANAGE_CHUNK_SIZE = 10;

const chunk = <Item>(items: Item[], size: number): Item[][] => {
	const chunks: Item[][] = [];

	for (let startIndex = 0; startIndex < items.length; startIndex += size) {
		chunks.push(items.slice(startIndex, startIndex + size));
	}

	return chunks;
};

const getFailedRepositoryNames = (
	results: ManageRepositoryResult[] | null
): string[] =>
	(results ?? [])
		.filter((result) => !result.ok)
		.map((result) => result.repository);

export interface ManageFlow {
	actions: ManageRepositoryActions;
	closeEditDialog: () => void;
	confirmationValue: string;
	editDialogRepositories: GitHubRepository[];
	isEditDialogOpen: boolean;
	isManaging: boolean;
	list: RepositoryListState;
	manageResults: ManageRepositoryResult[] | null;
	managingRepositoryCount: number;
	openEditDialog: (repositoryNames: string[]) => void;
	pendingRepositories: Set<string>;
	previewChange: (
		repositoryName: string,
		change: Partial<ManageRepositoryActions>
	) => void;
	resultsByRepository: Map<string, ManageRepositoryResult>;
	retryFailedRepositories: () => void;
	runEditDialog: () => Promise<void>;
	setActions: (actions: ManageRepositoryActions) => void;
	setConfirmationValue: (value: string) => void;
	setManageResults: (results: ManageRepositoryResult[] | null) => void;
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
	const [actions, setActions] = useState<ManageRepositoryActions>(
		DEFAULT_MANAGE_ACTIONS
	);
	const [confirmationValue, setConfirmationValue] = useState("");
	const [editTargets, setEditTargets] = useState<string[] | null>(null);
	const [isManaging, setIsManaging] = useState(false);
	const [lastRunActions, setLastRunActions] =
		useState<ManageRepositoryActions | null>(null);
	const [manageResults, setManageResults] = useState<
		ManageRepositoryResult[] | null
	>(null);
	const [pendingRepositories, setPendingRepositories] = useState<string[]>([]);
	const closingEditTargetsRef = useRef<GitHubRepository[]>([]);

	const editTargetRepositories = useMemo(() => {
		const editTargetSet = new Set(editTargets ?? []);

		return repositories.filter((repository) =>
			editTargetSet.has(repository.name)
		);
	}, [editTargets, repositories]);

	if (editTargetRepositories.length > 0) {
		// Keep the closing dialog readable while it fades out.
		closingEditTargetsRef.current = editTargetRepositories;
	}

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

	// The actions and confirmation reset when the dialog opens, so closing
	// leaves the dialog contents alone while it fades out.
	const openEditDialogWith = useCallback(
		(targetNames: string[], initialActions: ManageRepositoryActions): void => {
			setActions(initialActions);
			setConfirmationValue("");
			setEditTargets(targetNames);
		},
		[]
	);
	const openEditDialog = useCallback(
		(targetNames: string[]): void =>
			openEditDialogWith(targetNames, DEFAULT_MANAGE_ACTIONS),
		[openEditDialogWith]
	);

	const retryFailedRepositories = (): void => {
		const failedRepositories = getFailedRepositoryNames(manageResults);

		if (failedRepositories.length > 0) {
			openEditDialogWith(
				failedRepositories,
				lastRunActions ?? DEFAULT_MANAGE_ACTIONS
			);
		}
	};

	/** Opens the dialog for one repository with a change already picked, so it is reviewed before it runs. */
	const previewChange = useCallback(
		(
			repositoryName: string,
			change: Partial<ManageRepositoryActions>
		): void => {
			openEditDialogWith([repositoryName], {
				...DEFAULT_MANAGE_ACTIONS,
				...change,
			});
		},
		[openEditDialogWith]
	);

	const runChunks = async (
		changeInputs: ManageRepositoryChangeInput[]
	): Promise<{ error: string | null; results: ManageRepositoryResult[] }> => {
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

	const runEditDialog = async (): Promise<void> => {
		const changeInputs = (editTargets ?? []).map((repository) =>
			createManageChangeInput(repository, actions)
		);

		if (changeInputs.length === 0 || !hasManageAction(actions)) {
			return;
		}

		setLastRunActions(actions);
		setEditTargets(null);
		setIsManaging(true);
		setManageResults(null);
		setPendingRepositories(changeInputs.map((change) => change.repository));

		let run: Awaited<ReturnType<typeof runChunks>>;

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
		actions,
		closeEditDialog: () => setEditTargets(null),
		confirmationValue,
		editDialogRepositories:
			editTargets === null
				? closingEditTargetsRef.current
				: editTargetRepositories,
		isEditDialogOpen: editTargets !== null,
		isManaging,
		list,
		manageResults,
		managingRepositoryCount:
			pendingRepositories.length + (manageResults?.length ?? 0),
		openEditDialog,
		pendingRepositories: pendingRepositorySet,
		previewChange,
		resultsByRepository,
		retryFailedRepositories,
		runEditDialog,
		setActions,
		setConfirmationValue,
		setManageResults,
	};
}
