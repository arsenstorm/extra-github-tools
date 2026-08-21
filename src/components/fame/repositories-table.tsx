import { type KeyboardEvent, memo, useState } from "react";
import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import { EmptyTableRow } from "@/components/repositories/empty-table-row";
import { formatRepositoryPushedAt } from "@/components/repositories/list-utils";
import { stopEventPropagation } from "@/components/repositories/selectable-row";
import {
	ARCHIVED_BADGE,
	FORK_BADGE,
	StateBadge,
	VISIBILITY_BADGES,
} from "@/components/repositories/state-badges";
import {
	RepositoryTableHead,
	type TableColumn,
} from "@/components/repositories/table-head";
import { SkeletonRows } from "@/components/repositories/table-skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Strong, Text } from "@/components/ui/text";
import type { GitHubRepository } from "@/github/types";

export const FAME_TABLE_COLUMNS: TableColumn[] = [
	{ label: "Name" },
	{ className: "w-28", label: "Visibility" },
	{ className: "w-36", label: "Type" },
	{ className: "w-32", label: "Last pushed" },
];

/** A fixed-layout repository table whose rows open the analysis for that repository. */
export function RepositoriesTable({
	filteredRepositories,
	onSelect,
	placeholderRowCount = 0,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	onSelect: (repositoryName: string) => void;
	/** Rows to render as skeletons for repositories that are still loading. */
	placeholderRowCount?: number;
}>) {
	const isEmpty =
		filteredRepositories.length === 0 && placeholderRowCount === 0;
	// The actions column follows the data columns.
	const columnCount = FAME_TABLE_COLUMNS.length + 1;

	return (
		<Table className="-mr-6 md:mx-0" fixed>
			<RepositoryTableHead columns={FAME_TABLE_COLUMNS} />
			<TableBody>
				{filteredRepositories.map((repository) => (
					<FameRepositoryRow
						key={repository.id}
						onSelect={onSelect}
						repository={repository}
					/>
				))}
				<SkeletonRows
					columns={FAME_TABLE_COLUMNS}
					count={placeholderRowCount}
					selectable={false}
				/>
				{isEmpty ? <EmptyTableRow colSpan={columnCount} /> : null}
			</TableBody>
		</Table>
	);
}

/** Memoised so paging or filtering doesn't re-render rows that stayed put. */
const FameRepositoryRow = memo(function FameRepositoryRowComponent({
	onSelect,
	repository,
}: Readonly<{
	onSelect: (repositoryName: string) => void;
	repository: GitHubRepository;
}>) {
	// The actions menu mounts only once the row is hovered, pressed, or focused.
	const [isInteractive, setIsInteractive] = useState(false);
	const activate = (): void => setIsInteractive(true);

	const handleRowKeyDown = (
		event: KeyboardEvent<HTMLTableRowElement>
	): void => {
		const isRowTarget = event.target === event.currentTarget;
		const isSelectKey = event.key === "Enter" || event.key === " ";

		if (!(isRowTarget && isSelectKey)) {
			return;
		}

		event.preventDefault();
		onSelect(repository.name);
	};

	return (
		<TableRow
			className="cursor-pointer hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:-outline-offset-2 dark:hover:bg-zinc-800"
			onClick={() => onSelect(repository.name)}
			onFocusCapture={activate}
			onKeyDown={handleRowKeyDown}
			onPointerDownCapture={activate}
			onPointerEnter={activate}
			tabIndex={0}
		>
			<TableCell className="truncate">
				<Strong>{repository.name}</Strong>
			</TableCell>
			<TableCell>
				<StateBadge badge={VISIBILITY_BADGES[repository.visibility]} />
			</TableCell>
			<TableCell>
				<RepositoryTypeCell repository={repository} />
			</TableCell>
			<TableCell>
				<Text>{formatRepositoryPushedAt(repository.pushedAt)}</Text>
			</TableCell>
			<TableCell onClick={stopEventPropagation}>
				<RepositoryActionsMenu
					htmlUrl={repository.htmlUrl}
					interactive={isInteractive}
					repositoryName={repository.name}
				/>
			</TableCell>
		</TableRow>
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
			{repository.fork ? <StateBadge badge={FORK_BADGE} /> : null}
			{repository.archived ? <StateBadge badge={ARCHIVED_BADGE} /> : null}
		</div>
	);
}
