import { memo, useMemo, useState } from "react";
import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import { formatRepositoryPushedAt } from "@/components/repositories/list-utils";
import {
	SelectableRepositoryRow,
	stopEventPropagation,
} from "@/components/repositories/selectable-row";
import { SelectableRepositoriesTable } from "@/components/repositories/selectable-table";
import {
	getArchivedBadge,
	SUBSCRIPTION_BADGES,
	VISIBILITY_BADGES,
} from "@/components/repositories/state-badges";
import {
	RepositoryStatusBadge,
	type StatusBadgeStyle,
} from "@/components/repositories/status-badge";
import type { TableColumn } from "@/components/repositories/table-head";
import { DropdownItem, DropdownLabel } from "@/components/ui/dropdown";
import { TableCell } from "@/components/ui/table";
import { Strong, Text } from "@/components/ui/text";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryResult,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "@/github/types";
import { EditableStateCell, type StateOption } from "./editable-state-cell";
import {
	MANAGE_ARCHIVE_TARGET_OPTIONS,
	MANAGE_SUBSCRIPTION_TARGET_OPTIONS,
	type ManageRepositoryArchiveState,
	type ManageRepositoryStatus,
} from "./types";
import {
	getManageRepositoryStatus,
	getManageVisibilityTargetOptions,
	type StagedChanges,
} from "./utils";

export const MANAGE_TABLE_COLUMNS: TableColumn[] = [
	{ label: "Name" },
	{ className: "w-28", label: "Visibility" },
	{ className: "w-28", label: "Archived" },
	{ className: "w-36", label: "Notifications" },
	{ className: "w-32", label: "Last pushed" },
	{ className: "w-36", label: "Status" },
];

const STATUS_BADGES: Record<
	Exclude<ManageRepositoryStatus, "idle">,
	StatusBadgeStyle
> = {
	failed: { label: "Failed", tone: "failed" },
	pending: { label: "Pending", tone: "pending" },
	staged: { label: "Staged", tone: "info" },
	unchanged: { label: "No change needed" },
	updated: { label: "Updated", tone: "success" },
};

const NO_SUBSCRIPTION_BADGE: StatusBadgeStyle = { label: "—" };

// Fixed widths sized to each column's longest label, so cycling values doesn't shift the row.
const VISIBILITY_CELL_CLASS_NAME = "w-[4.5rem]";
const ARCHIVED_CELL_CLASS_NAME = "w-[4.5rem]";
const SUBSCRIPTION_CELL_CLASS_NAME = "w-[5.75rem]";

type StageChange = (
	repositoryName: string,
	change: Partial<ManageRepositoryActions>
) => void;

export function RepositoriesTable({
	filteredRepositories,
	isManaging,
	onEditRepository,
	onStageChange,
	onToggle,
	onToggleAll,
	pendingRepositories,
	placeholderRowCount = 0,
	resultsByRepository,
	selectedRepositories,
	stagedChanges,
	supportsInternalVisibility,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	isManaging: boolean;
	onEditRepository: (repositoryName: string) => void;
	onStageChange: StageChange;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	onToggleAll: () => void;
	pendingRepositories: Set<string>;
	/** Rows to render as skeletons for repositories that are still loading. */
	placeholderRowCount?: number;
	resultsByRepository: Map<string, ManageRepositoryResult>;
	selectedRepositories: Set<string>;
	stagedChanges: StagedChanges;
	supportsInternalVisibility: boolean;
}>) {
	const visibilityOptions = useMemo(
		() => getManageVisibilityTargetOptions(supportsInternalVisibility),
		[supportsInternalVisibility]
	);

	return (
		<SelectableRepositoriesTable
			columns={MANAGE_TABLE_COLUMNS}
			disabled={isManaging}
			onToggleAll={onToggleAll}
			placeholderRowCount={placeholderRowCount}
			repositoryNames={filteredRepositories.map(
				(repository) => repository.name
			)}
			selectedRepositories={selectedRepositories}
		>
			{filteredRepositories.map((repository) => (
				<RepositoryRow
					isManaging={isManaging}
					isPending={pendingRepositories.has(repository.name)}
					isSelected={selectedRepositories.has(repository.name)}
					key={repository.id}
					onEditRepository={onEditRepository}
					onStageChange={onStageChange}
					onToggle={onToggle}
					repository={repository}
					stagedActions={stagedChanges.get(repository.name)}
					status={getManageRepositoryStatus(
						repository.name,
						pendingRepositories,
						resultsByRepository
					)}
					visibilityOptions={visibilityOptions}
				/>
			))}
		</SelectableRepositoriesTable>
	);
}

/** Memoised so selecting or editing one row doesn't re-render the other 99. */
const RepositoryRow = memo(function RepositoryRowComponent({
	isManaging,
	isPending,
	isSelected,
	onEditRepository,
	onStageChange,
	onToggle,
	repository,
	stagedActions,
	status,
	visibilityOptions,
}: Readonly<{
	isManaging: boolean;
	isPending: boolean;
	isSelected: boolean;
	onEditRepository: (repositoryName: string) => void;
	onStageChange: StageChange;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	repository: GitHubRepository;
	stagedActions: ManageRepositoryActions | undefined;
	status: ManageRepositoryStatus;
	visibilityOptions: readonly StateOption<RepositoryVisibility>[];
}>) {
	// The actions menu mounts only once the row is hovered, pressed, or focused.
	const [isInteractive, setIsInteractive] = useState(false);
	const displayStatus = status === "idle" && stagedActions ? "staged" : status;

	return (
		<SelectableRepositoryRow
			disabled={isManaging}
			isSelected={isSelected}
			onActivate={() => setIsInteractive(true)}
			onToggle={onToggle}
			repositoryName={repository.name}
		>
			<TableCell className="truncate">
				<Strong>{repository.name}</Strong>
			</TableCell>
			<EditableRepositoryCells
				disabled={isManaging || isPending}
				onStageChange={onStageChange}
				repository={repository}
				stagedActions={stagedActions}
				visibilityOptions={visibilityOptions}
			/>
			<TableCell>
				<Text>{formatRepositoryPushedAt(repository.pushedAt)}</Text>
			</TableCell>
			<TableCell>
				<RepositoryStatusBadge badges={STATUS_BADGES} status={displayStatus} />
			</TableCell>
			<TableCell onClick={stopEventPropagation}>
				<RepositoryActionsMenu
					htmlUrl={repository.htmlUrl}
					interactive={isInteractive}
					repositoryName={repository.name}
				>
					<DropdownItem
						disabled={isManaging}
						onClick={() => onEditRepository(repository.name)}
					>
						<DropdownLabel>Edit settings</DropdownLabel>
					</DropdownItem>
				</RepositoryActionsMenu>
			</TableCell>
		</SelectableRepositoryRow>
	);
});

/** The visibility, archived, and notifications cells, each showing the staged value when there is one. */
function EditableRepositoryCells({
	disabled,
	onStageChange,
	repository,
	stagedActions,
	visibilityOptions,
}: Readonly<{
	disabled: boolean;
	onStageChange: StageChange;
	repository: GitHubRepository;
	stagedActions: ManageRepositoryActions | undefined;
	visibilityOptions: readonly StateOption<RepositoryVisibility>[];
}>) {
	const { name } = repository;
	const stagedVisibility =
		stagedActions?.visibilityAction === "current"
			? undefined
			: stagedActions?.visibilityAction;
	const stagedArchived =
		stagedActions?.archiveAction === "current"
			? undefined
			: stagedActions?.archiveAction;
	const stagedSubscription =
		stagedActions?.subscriptionAction === "current"
			? undefined
			: stagedActions?.subscriptionAction;

	const visibility = stagedVisibility ?? repository.visibility;
	const archived: ManageRepositoryArchiveState =
		stagedArchived ?? (repository.archived ? "archived" : "unarchived");
	const subscription: RepositorySubscriptionState | null =
		stagedSubscription ?? repository.subscription;

	return (
		<>
			<EditableStateCell<RepositoryVisibility>
				ariaLabel={`Visibility for ${name}`}
				badge={VISIBILITY_BADGES[visibility]}
				className={VISIBILITY_CELL_CLASS_NAME}
				disabled={disabled}
				isStaged={stagedVisibility !== undefined}
				onSelect={(value) => onStageChange(name, { visibilityAction: value })}
				options={visibilityOptions}
				value={visibility}
			/>
			<EditableStateCell<ManageRepositoryArchiveState>
				ariaLabel={`Archived state for ${name}`}
				badge={getArchivedBadge(archived === "archived")}
				className={ARCHIVED_CELL_CLASS_NAME}
				disabled={disabled}
				isStaged={stagedArchived !== undefined}
				onSelect={(value) => onStageChange(name, { archiveAction: value })}
				options={MANAGE_ARCHIVE_TARGET_OPTIONS}
				value={archived}
			/>
			<EditableStateCell<RepositorySubscriptionState>
				ariaLabel={`Notifications for ${name}`}
				badge={
					subscription === null
						? NO_SUBSCRIPTION_BADGE
						: SUBSCRIPTION_BADGES[subscription]
				}
				className={SUBSCRIPTION_CELL_CLASS_NAME}
				disabled={disabled}
				isStaged={stagedSubscription !== undefined}
				onSelect={(value) => onStageChange(name, { subscriptionAction: value })}
				options={MANAGE_SUBSCRIPTION_TARGET_OPTIONS}
				value={subscription}
			/>
		</>
	);
}
