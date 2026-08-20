import { CheckIcon, ChevronDownIcon } from "@heroicons/react/16/solid";
import { memo, useMemo, useState } from "react";
import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import {
	RepositoryBadge,
	type RepositoryStatusTone,
} from "@/components/repositories/badge";
import { EmptyTableRow } from "@/components/repositories/empty-table-row";
import { formatRepositoryPushedAt } from "@/components/repositories/list-utils";
import {
	getVisibleSelection,
	SelectableRepositoryRow,
	SelectableRowHeader,
	stopEventPropagation,
} from "@/components/repositories/selectable-row";
import {
	ACTIONS_COLUMN_CLASS_NAME,
	SkeletonRows,
	type TableColumn,
} from "@/components/repositories/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dropdown,
	DropdownButton,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from "@/components/ui/dropdown";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Strong, Text } from "@/components/ui/text";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryResult,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "@/github/types";
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
const TABLE_COLUMN_COUNT = MANAGE_TABLE_COLUMNS.length + 2;

const SUBSCRIPTION_STATE_CELL_LABELS: Record<
	RepositorySubscriptionState,
	string
> = {
	ignoring: "Ignoring",
	unwatching: "Not watching",
	watching: "Watching",
};

const STATUS_BADGES: Record<
	Exclude<ManageRepositoryStatus, "idle" | "unchanged">,
	{ label: string; tone: RepositoryStatusTone }
> = {
	failed: { label: "Failed", tone: "failed" },
	pending: { label: "Pending", tone: "pending" },
	updated: { label: "Updated", tone: "success" },
};

const capitalize = (value: string): string =>
	value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

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
	onPreviewChange: (
		repositoryName: string,
		change: Partial<ManageRepositoryActions>
	) => void;
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

	const visibleSelection = getVisibleSelection(
		filteredRepositories.map((repository) => repository.name),
		selectedRepositories
	);

	return (
		<Table fixed>
			<TableHead>
				<TableRow>
					<SelectableRowHeader
						disabled={isManaging || filteredRepositories.length === 0}
						onToggleAll={onToggleAll}
						selection={visibleSelection}
					/>
					{MANAGE_TABLE_COLUMNS.map((column) => (
						<TableHeader className={column.className} key={column.label}>
							{column.label}
						</TableHeader>
					))}
					<TableHeader className={ACTIONS_COLUMN_CLASS_NAME}>
						<span className="sr-only">Actions</span>
					</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
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
				<SkeletonRows
					columns={MANAGE_TABLE_COLUMNS}
					count={placeholderRowCount}
				/>
				{filteredRepositories.length === 0 && placeholderRowCount === 0 ? (
					<EmptyTableRow colSpan={TABLE_COLUMN_COUNT} />
				) : null}
			</TableBody>
		</Table>
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
	onPreviewChange: (
		repositoryName: string,
		change: Partial<ManageRepositoryActions>
	) => void;
	onEditRepository: (repositoryName: string) => void;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	repository: GitHubRepository;
	status: ManageRepositoryStatus;
	visibilityOptions: ReadonlyArray<{
		label: string;
		value: RepositoryVisibility;
	}>;
}>) {
	// Menus mount only once the row is hovered, pressed, or focused; until then
	// the cells render look-alike buttons so a 100-row page paints quickly.
	const [isInteractive, setIsInteractive] = useState(false);
	const isEditingDisabled = isManaging || isPending;
	const subscriptionState = repository.subscription;

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
			<TableCell onClick={stopEventPropagation}>
				<EditableStateCell<RepositoryVisibility>
					ariaLabel={`Visibility for ${repository.name}`}
					disabled={isEditingDisabled}
					interactive={isInteractive}
					onSelect={(value) =>
						onPreviewChange(repository.name, { visibilityAction: value })
					}
					options={visibilityOptions}
					value={repository.visibility}
				>
					<CellText>{capitalize(repository.visibility)}</CellText>
				</EditableStateCell>
			</TableCell>
			<TableCell onClick={stopEventPropagation}>
				<EditableStateCell<ManageRepositoryArchiveState>
					ariaLabel={`Archived state for ${repository.name}`}
					disabled={isEditingDisabled}
					interactive={isInteractive}
					onSelect={(value) =>
						onPreviewChange(repository.name, { archiveAction: value })
					}
					options={MANAGE_ARCHIVE_TARGET_OPTIONS}
					value={repository.archived ? "archived" : "unarchived"}
				>
					<CellText>{repository.archived ? "Archived" : "Active"}</CellText>
				</EditableStateCell>
			</TableCell>
			<TableCell onClick={stopEventPropagation}>
				<EditableStateCell<RepositorySubscriptionState>
					ariaLabel={`Notifications for ${repository.name}`}
					disabled={isEditingDisabled}
					interactive={isInteractive}
					onSelect={(value) =>
						onPreviewChange(repository.name, { subscriptionAction: value })
					}
					options={MANAGE_SUBSCRIPTION_TARGET_OPTIONS}
					value={subscriptionState}
				>
					<CellText>
						{subscriptionState === null
							? "—"
							: SUBSCRIPTION_STATE_CELL_LABELS[subscriptionState]}
					</CellText>
				</EditableStateCell>
			</TableCell>
			<TableCell>
				<Text>{formatRepositoryPushedAt(repository.pushedAt)}</Text>
			</TableCell>
			<TableCell>
				<RepositoryStatusBadge status={status} />
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

const STATE_CELL_BUTTON_CLASS_NAME =
	"group -mx-1.5 gap-x-1.5 px-1.5! py-1! font-normal!";
const STATE_CELL_CHEVRON_CLASS_NAME =
	"size-3! text-zinc-400! group-data-hover:text-zinc-600! group-data-open:text-zinc-600! dark:group-data-hover:text-zinc-200! dark:group-data-open:text-zinc-200!";

function EditableStateCell<T extends string>({
	ariaLabel,
	children,
	disabled,
	interactive,
	onSelect,
	options,
	value,
}: Readonly<{
	ariaLabel: string;
	children: React.ReactNode;
	disabled: boolean;
	/** Whether to mount the real menu; false renders an identical-looking button. */
	interactive: boolean;
	onSelect: (value: T) => void;
	options: ReadonlyArray<{
		label: string;
		value: T;
	}>;
	value: T | null;
}>) {
	if (!interactive) {
		return (
			<Button
				aria-label={ariaLabel}
				className={STATE_CELL_BUTTON_CLASS_NAME}
				disabled={disabled}
				onClick={stopEventPropagation}
				plain
				type="button"
			>
				{children}
				<ChevronDownIcon className={STATE_CELL_CHEVRON_CLASS_NAME} />
			</Button>
		);
	}

	return (
		<Dropdown>
			<DropdownButton
				aria-label={ariaLabel}
				className={STATE_CELL_BUTTON_CLASS_NAME}
				disabled={disabled}
				onClick={stopEventPropagation}
				plain
			>
				{children}
				<ChevronDownIcon className={STATE_CELL_CHEVRON_CLASS_NAME} />
			</DropdownButton>
			<DropdownMenu anchor="bottom start">
				{options.map((option) => (
					<DropdownItem
						key={option.value}
						onClick={() => {
							if (option.value !== value) {
								onSelect(option.value);
							}
						}}
					>
						{option.value === value ? <CheckIcon /> : null}
						<DropdownLabel>{option.label}</DropdownLabel>
					</DropdownItem>
				))}
			</DropdownMenu>
		</Dropdown>
	);
}

function CellText({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<span className="text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
			{children}
		</span>
	);
}

function RepositoryStatusBadge({
	status,
}: Readonly<{
	status: ManageRepositoryStatus;
}>) {
	if (status === "idle") {
		return <Text>Not queued</Text>;
	}

	if (status === "unchanged") {
		return <RepositoryBadge>No change needed</RepositoryBadge>;
	}

	const { label, tone } = STATUS_BADGES[status];

	return <RepositoryBadge tone={tone}>{label}</RepositoryBadge>;
}
