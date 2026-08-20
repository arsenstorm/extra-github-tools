import { memo, useMemo, useState } from "react";
import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import { formatRepositoryPushedAt } from "@/components/repositories/list-utils";
import {
	SelectableRepositoryRow,
	stopEventPropagation,
} from "@/components/repositories/selectable-row";
import { SelectableRepositoriesTable } from "@/components/repositories/selectable-table";
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
} from "./utils";

export const MANAGE_TABLE_COLUMNS: TableColumn[] = [
	{ label: "Name" },
	{ className: "w-28", label: "Visibility" },
	{ className: "w-28", label: "Archived" },
	{ className: "w-36", label: "Notifications" },
	{ className: "w-32", label: "Last pushed" },
	{ className: "w-36", label: "Status" },
];

const SUBSCRIPTION_STATE_CELL_LABELS: Record<
	RepositorySubscriptionState,
	string
> = {
	ignoring: "Ignoring",
	unwatching: "Not watching",
	watching: "Watching",
};

const STATUS_BADGES: Record<
	Exclude<ManageRepositoryStatus, "idle">,
	StatusBadgeStyle
> = {
	failed: { label: "Failed", tone: "failed" },
	pending: { label: "Pending", tone: "pending" },
	unchanged: { label: "No change needed" },
	updated: { label: "Updated", tone: "success" },
};

const capitalize = (value: string): string =>
	value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

type PreviewChange = (
	repositoryName: string,
	change: Partial<ManageRepositoryActions>
) => void;

export function RepositoriesTable({
	filteredRepositories,
	isManaging,
	onPreviewChange,
	onEditRepository,
	onToggle,
	onToggleAll,
	pendingRepositories,
	placeholderRowCount = 0,
	resultsByRepository,
	selectedRepositories,
	supportsInternalVisibility,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	isManaging: boolean;
	onPreviewChange: PreviewChange;
	onEditRepository: (repositoryName: string) => void;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	onToggleAll: () => void;
	pendingRepositories: Set<string>;
	/** Rows to render as skeletons for repositories that are still loading. */
	placeholderRowCount?: number;
	resultsByRepository: Map<string, ManageRepositoryResult>;
	selectedRepositories: Set<string>;
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
					onPreviewChange={onPreviewChange}
					onToggle={onToggle}
					repository={repository}
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
	onPreviewChange,
	onEditRepository,
	onToggle,
	repository,
	status,
	visibilityOptions,
}: Readonly<{
	isManaging: boolean;
	isPending: boolean;
	isSelected: boolean;
	onPreviewChange: PreviewChange;
	onEditRepository: (repositoryName: string) => void;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	repository: GitHubRepository;
	status: ManageRepositoryStatus;
	visibilityOptions: readonly StateOption<RepositoryVisibility>[];
}>) {
	// Menus mount only once the row is hovered, pressed, or focused; until then
	// the cells render look-alike buttons so a 100-row page paints quickly.
	const [isInteractive, setIsInteractive] = useState(false);

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
				interactive={isInteractive}
				onPreviewChange={onPreviewChange}
				repository={repository}
				visibilityOptions={visibilityOptions}
			/>
			<TableCell>
				<Text>{formatRepositoryPushedAt(repository.pushedAt)}</Text>
			</TableCell>
			<TableCell>
				<RepositoryStatusBadge badges={STATUS_BADGES} status={status} />
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

/** The visibility, archived, and notifications cells; each pick opens the review dialog. */
function EditableRepositoryCells({
	disabled,
	interactive,
	onPreviewChange,
	repository,
	visibilityOptions,
}: Readonly<{
	disabled: boolean;
	interactive: boolean;
	onPreviewChange: PreviewChange;
	repository: GitHubRepository;
	visibilityOptions: readonly StateOption<RepositoryVisibility>[];
}>) {
	const { name, subscription } = repository;

	return (
		<>
			<EditableStateCell<RepositoryVisibility>
				ariaLabel={`Visibility for ${name}`}
				disabled={disabled}
				interactive={interactive}
				label={capitalize(repository.visibility)}
				onSelect={(value) => onPreviewChange(name, { visibilityAction: value })}
				options={visibilityOptions}
				value={repository.visibility}
			/>
			<EditableStateCell<ManageRepositoryArchiveState>
				ariaLabel={`Archived state for ${name}`}
				disabled={disabled}
				interactive={interactive}
				label={repository.archived ? "Archived" : "Active"}
				onSelect={(value) => onPreviewChange(name, { archiveAction: value })}
				options={MANAGE_ARCHIVE_TARGET_OPTIONS}
				value={repository.archived ? "archived" : "unarchived"}
			/>
			<EditableStateCell<RepositorySubscriptionState>
				ariaLabel={`Notifications for ${name}`}
				disabled={disabled}
				interactive={interactive}
				label={
					subscription === null
						? "—"
						: SUBSCRIPTION_STATE_CELL_LABELS[subscription]
				}
				onSelect={(value) =>
					onPreviewChange(name, { subscriptionAction: value })
				}
				options={MANAGE_SUBSCRIPTION_TARGET_OPTIONS}
				value={subscription}
			/>
		</>
	);
}
