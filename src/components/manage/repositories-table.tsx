import { Checkbox } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/16/solid";
import { type KeyboardEvent, type MouseEvent, useRef } from "react";
import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import { formatRepositoryPushedAt } from "@/components/repositories/list-utils";
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
	ManageRepositoryResult,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "@/github";
import type { ManageRepositoryChangeInput } from "@/server-functions";
import {
	MANAGE_ARCHIVE_TARGET_OPTIONS,
	MANAGE_SUBSCRIPTION_TARGET_OPTIONS,
	type ManageRepositoryArchiveState,
	type ManageRepositoryStatus,
} from "./types";
import {
	getManageRepositoryStatus,
	getManageVisibilityTargetOptions,
	getRepositorySubscriptionDisplayState,
} from "./utils";

const TABLE_COLUMN_COUNT = 8;

const capitalize = (value: string): string =>
	value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

const stopEventPropagation = (event: MouseEvent): void =>
	event.stopPropagation();

export function RepositoriesTable({
	filteredRepositories,
	isManaging,
	onApplyChange,
	onEditRepository,
	onToggle,
	pendingRepositories,
	resultsByRepository,
	selectedRepositories,
	supportsInternalVisibility,
	watchedRepositories,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	isManaging: boolean;
	onApplyChange: (change: ManageRepositoryChangeInput) => void;
	onEditRepository: (repositoryName: string) => void;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	pendingRepositories: Set<string>;
	resultsByRepository: Map<string, ManageRepositoryResult>;
	selectedRepositories: Set<string>;
	supportsInternalVisibility: boolean;
	watchedRepositories: Set<string> | null;
}>) {
	const visibilityOptions = getManageVisibilityTargetOptions(
		supportsInternalVisibility
	);

	return (
		<div>
			<Table>
				<TableHead>
					<TableRow>
						<TableHeader className="w-0 pr-2! pl-4!">
							<span className="sr-only">Select</span>
						</TableHeader>
						<TableHeader>Name</TableHeader>
						<TableHeader>Visibility</TableHeader>
						<TableHeader>Archived</TableHeader>
						<TableHeader>Notifications</TableHeader>
						<TableHeader>Last pushed</TableHeader>
						<TableHeader>Status</TableHeader>
						<TableHeader className="w-0">
							<span className="sr-only">Actions</span>
						</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{filteredRepositories.length > 0 ? (
						filteredRepositories.map((repository) => (
							<RepositoryRow
								isManaging={isManaging}
								isPending={pendingRepositories.has(repository.name)}
								isSelected={selectedRepositories.has(repository.name)}
								key={repository.id}
								onApplyChange={onApplyChange}
								onEditRepository={onEditRepository}
								onToggle={onToggle}
								repository={repository}
								status={getManageRepositoryStatus(
									repository.name,
									pendingRepositories,
									resultsByRepository
								)}
								visibilityOptions={visibilityOptions}
								watchedRepositories={watchedRepositories}
							/>
						))
					) : (
						<TableRow>
							<TableCell className="text-center" colSpan={TABLE_COLUMN_COUNT}>
								No repositories found.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function RepositoryRow({
	isManaging,
	isPending,
	isSelected,
	onApplyChange,
	onEditRepository,
	onToggle,
	repository,
	status,
	visibilityOptions,
	watchedRepositories,
}: Readonly<{
	isManaging: boolean;
	isPending: boolean;
	isSelected: boolean;
	onApplyChange: (change: ManageRepositoryChangeInput) => void;
	onEditRepository: (repositoryName: string) => void;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	repository: GitHubRepository;
	status: ManageRepositoryStatus;
	visibilityOptions: ReadonlyArray<{
		label: string;
		value: RepositoryVisibility;
	}>;
	watchedRepositories: Set<string> | null;
}>) {
	const checkboxShouldSelectRangeRef = useRef(false);
	const isEditingDisabled = isManaging || isPending;
	const subscriptionState = watchedRepositories
		? getRepositorySubscriptionDisplayState(
				repository.name,
				watchedRepositories
			)
		: null;

	const handleRowKeyDown = (
		event: KeyboardEvent<HTMLTableRowElement>
	): void => {
		if (event.target !== event.currentTarget) {
			return;
		}

		if (isManaging) {
			return;
		}

		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onToggle(repository.name, event.shiftKey);
		}
	};

	return (
		<TableRow
			aria-selected={isSelected}
			className="cursor-pointer hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:-outline-offset-2 dark:hover:bg-zinc-800"
			onClick={(event) => {
				if (!isManaging) {
					onToggle(repository.name, event.shiftKey);
				}
			}}
			onKeyDown={handleRowKeyDown}
			tabIndex={0}
		>
			<TableCell className="pr-2! pl-4!">
				<Checkbox
					aria-label={`Select ${repository.name}`}
					checked={isSelected}
					className="group block size-4 rounded border-none! bg-white data-checked:bg-zinc-500 data-disabled:opacity-50"
					disabled={isManaging}
					onChange={() => {
						onToggle(repository.name, checkboxShouldSelectRangeRef.current);
						checkboxShouldSelectRangeRef.current = false;
					}}
					onClick={stopEventPropagation}
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
				<Strong>{repository.name}</Strong>
			</TableCell>
			<TableCell onClick={stopEventPropagation}>
				<EditableStateCell<RepositoryVisibility>
					ariaLabel={`Visibility for ${repository.name}`}
					disabled={isEditingDisabled}
					onSelect={(value) =>
						onApplyChange({
							repository: repository.name,
							visibilityAction: value,
						})
					}
					options={visibilityOptions}
					value={repository.visibility}
				>
					<RepositoryBadge>{capitalize(repository.visibility)}</RepositoryBadge>
				</EditableStateCell>
			</TableCell>
			<TableCell onClick={stopEventPropagation}>
				<EditableStateCell<ManageRepositoryArchiveState>
					ariaLabel={`Archived state for ${repository.name}`}
					disabled={isEditingDisabled}
					onSelect={(value) =>
						onApplyChange({
							archiveAction: value,
							repository: repository.name,
						})
					}
					options={MANAGE_ARCHIVE_TARGET_OPTIONS}
					value={repository.archived ? "archived" : "unarchived"}
				>
					{repository.archived ? (
						<RepositoryBadge>Archived</RepositoryBadge>
					) : (
						<CellText>Active</CellText>
					)}
				</EditableStateCell>
			</TableCell>
			<TableCell onClick={stopEventPropagation}>
				<EditableStateCell<RepositorySubscriptionState>
					ariaLabel={`Notifications for ${repository.name}`}
					disabled={isEditingDisabled}
					onSelect={(value) =>
						onApplyChange({
							repository: repository.name,
							subscriptionAction: value,
						})
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
		</TableRow>
	);
}

const SUBSCRIPTION_STATE_CELL_LABELS = {
	ignoring: "Ignoring",
	unwatching: "Not watching",
	watching: "Watching",
} as const;

function EditableStateCell<T extends string>({
	ariaLabel,
	children,
	disabled,
	onSelect,
	options,
	value,
}: Readonly<{
	ariaLabel: string;
	children: React.ReactNode;
	disabled: boolean;
	onSelect: (value: T) => void;
	options: ReadonlyArray<{
		label: string;
		value: T;
	}>;
	value: T | null;
}>) {
	return (
		<Dropdown>
			<DropdownButton
				aria-label={ariaLabel}
				className="group -mx-1.5 gap-x-1.5 px-1.5! py-1! font-normal!"
				disabled={disabled}
				onClick={stopEventPropagation}
				plain
			>
				{children}
				<ChevronDownIcon className="size-3! text-zinc-400! opacity-0 group-data-hover:opacity-100 group-data-open:opacity-100" />
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
	status: ManageRepositoryStatus;
}>) {
	if (status === "idle") {
		return <Text>Not queued</Text>;
	}

	if (status === "unchanged") {
		return <RepositoryBadge>No change needed</RepositoryBadge>;
	}

	const labelByStatus = {
		failed: "Failed",
		pending: "Pending",
		updated: "Updated",
	} as const;
	const classNameByStatus = {
		failed:
			"border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
		pending:
			"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
		updated:
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
