import { memo, useState } from "react";
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
	TransferRepositoryResult,
} from "@/github/types";
import type { RepositoryStatus } from "./types";
import { getRepositoryStatus } from "./utils";

export const TRANSFER_TABLE_COLUMNS: TableColumn[] = [
	{ label: "Name" },
	{ className: "w-28", label: "Visibility" },
	{ className: "w-36", label: "Type" },
	{ className: "w-32", label: "Last pushed" },
	{ className: "w-32", label: "Status" },
];
const TABLE_COLUMN_COUNT = TRANSFER_TABLE_COLUMNS.length + 2;

const STATUS_BADGES: Record<
	Exclude<RepositoryStatus, "idle">,
	{ label: string; tone: RepositoryStatusTone }
> = {
	failed: { label: "Failed", tone: "failed" },
	pending: { label: "Pending", tone: "pending" },
	transferred: { label: "Transferred", tone: "success" },
};

export function RepositoriesTable({
	filteredRepositories,
	isTransferring,
	onToggle,
	onToggleAll,
	pendingRepositories,
	placeholderRowCount = 0,
	resultsByRepository,
	selectedRepositories,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	isTransferring: boolean;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	onToggleAll: () => void;
	pendingRepositories: Set<string>;
	/** Rows to render as skeletons for repositories that are still loading. */
	placeholderRowCount?: number;
	resultsByRepository: Map<string, TransferRepositoryResult>;
	selectedRepositories: Set<string>;
}>) {
	const visibleSelection = getVisibleSelection(
		filteredRepositories.map((repository) => repository.name),
		selectedRepositories
	);

	return (
		<Table fixed>
			<TableHead>
				<TableRow>
					<SelectableRowHeader
						disabled={isTransferring || filteredRepositories.length === 0}
						onToggleAll={onToggleAll}
						selection={visibleSelection}
					/>
					{TRANSFER_TABLE_COLUMNS.map((column) => (
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
					<TransferRepositoryRow
						isSelected={selectedRepositories.has(repository.name)}
						isTransferring={isTransferring}
						key={repository.id}
						onToggle={onToggle}
						repository={repository}
						status={getRepositoryStatus(
							repository.name,
							pendingRepositories,
							resultsByRepository
						)}
					/>
				))}

				<SkeletonRows
					columns={TRANSFER_TABLE_COLUMNS}
					count={placeholderRowCount}
				/>
				{filteredRepositories.length === 0 && placeholderRowCount === 0 ? (
					<EmptyTableRow colSpan={TABLE_COLUMN_COUNT} />
				) : null}
			</TableBody>
		</Table>
	);
}

/** Memoised so selecting one row doesn't re-render the other 99. */
const TransferRepositoryRow = memo(function TransferRepositoryRowComponent({
	isSelected,
	isTransferring,
	onToggle,
	repository,
	status,
}: Readonly<{
	isSelected: boolean;
	isTransferring: boolean;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	repository: GitHubRepository;
	status: RepositoryStatus;
}>) {
	// The actions menu mounts only once the row is hovered, pressed, or focused.
	const [isInteractive, setIsInteractive] = useState(false);

	return (
		<SelectableRepositoryRow
			disabled={isTransferring}
			isSelected={isSelected}
			onActivate={() => setIsInteractive(true)}
			onToggle={onToggle}
			repositoryName={repository.name}
		>
			<TableCell className="truncate">
				<Strong>{repository.name}</Strong>
			</TableCell>
			<TableCell>
				<RepositoryBadge>
					{repository.private ? "Private" : "Public"}
				</RepositoryBadge>
			</TableCell>
			<TableCell>
				<RepositoryTypeCell repository={repository} />
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
				/>
			</TableCell>
		</SelectableRepositoryRow>
	);
});

function RepositoryTypeCell({
	repository,
}: Readonly<{
	repository: GitHubRepository;
}>) {
	if (!(repository.fork || repository.archived)) {
		return <Text>Source</Text>;
	}

	return (
		<div className="flex gap-2">
			{repository.fork ? <RepositoryBadge>Fork</RepositoryBadge> : null}
			{repository.archived ? <RepositoryBadge>Archived</RepositoryBadge> : null}
		</div>
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

	const { label, tone } = STATUS_BADGES[status];

	return <RepositoryBadge tone={tone}>{label}</RepositoryBadge>;
}
