import { memo, useState } from "react";
import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import { RepositoryBadge } from "@/components/repositories/badge";
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
import { TableCell } from "@/components/ui/table";
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

const STATUS_BADGES: Record<
	Exclude<RepositoryStatus, "idle">,
	StatusBadgeStyle
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
	return (
		<SelectableRepositoriesTable
			columns={TRANSFER_TABLE_COLUMNS}
			disabled={isTransferring}
			onToggleAll={onToggleAll}
			placeholderRowCount={placeholderRowCount}
			repositoryNames={filteredRepositories.map(
				(repository) => repository.name
			)}
			selectedRepositories={selectedRepositories}
		>
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
		</SelectableRepositoriesTable>
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
				<RepositoryStatusBadge badges={STATUS_BADGES} status={status} />
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
