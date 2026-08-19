import { Checkbox } from "@headlessui/react";
import { type KeyboardEvent, useRef } from "react";
import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import { formatRepositoryPushedAt } from "@/components/repositories/list-utils";
import { DropdownItem, DropdownLabel } from "@/components/ui/dropdown";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Strong, Text } from "@/components/ui/text";
import type { GitHubRepository, ManageRepositoryResult } from "@/github";
import type { ManageRepositoryStatus } from "./types";
import { getManageRepositoryStatus } from "./utils";

const TABLE_COLUMN_COUNT = 8;

const capitalize = (value: string): string =>
	value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

export function RepositoriesTable({
	filteredRepositories,
	isManaging,
	onEditRepository,
	onToggle,
	pendingRepositories,
	resultsByRepository,
	selectedRepositories,
	watchedRepositories,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	isManaging: boolean;
	onEditRepository: (repositoryName: string) => void;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	pendingRepositories: Set<string>;
	resultsByRepository: Map<string, ManageRepositoryResult>;
	selectedRepositories: Set<string>;
	watchedRepositories: Set<string>;
}>) {
	const checkboxShouldSelectRangeRef = useRef(false);

	const handleRowKeyDown = (
		event: KeyboardEvent<HTMLTableRowElement>,
		repositoryName: string
	): void => {
		if (event.target !== event.currentTarget) {
			return;
		}

		if (isManaging) {
			return;
		}

		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onToggle(repositoryName, event.shiftKey);
		}
	};

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
						filteredRepositories.map((repository) => {
							const repositoryStatus = getManageRepositoryStatus(
								repository.name,
								pendingRepositories,
								resultsByRepository
							);

							return (
								<TableRow
									aria-selected={selectedRepositories.has(repository.name)}
									className="cursor-pointer hover:bg-zinc-100 focus:outline-2 focus:outline-blue-500 dark:hover:bg-zinc-800"
									key={repository.id}
									onClick={(event) => {
										if (!isManaging) {
											onToggle(repository.name, event.shiftKey);
										}
									}}
									onKeyDown={(event) =>
										handleRowKeyDown(event, repository.name)
									}
									tabIndex={0}
								>
									<TableCell className="pr-2! pl-4!">
										<Checkbox
											aria-label={`Select ${repository.name}`}
											checked={selectedRepositories.has(repository.name)}
											className="group block size-4 rounded border-none! bg-white data-checked:bg-zinc-500 data-disabled:opacity-50"
											disabled={isManaging}
											onChange={() => {
												onToggle(
													repository.name,
													checkboxShouldSelectRangeRef.current
												);
												checkboxShouldSelectRangeRef.current = false;
											}}
											onClick={(event) => event.stopPropagation()}
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
									<TableCell>
										<RepositoryBadge>
											{capitalize(repository.visibility)}
										</RepositoryBadge>
									</TableCell>
									<TableCell>
										{repository.archived ? (
											<RepositoryBadge>Archived</RepositoryBadge>
										) : (
											<Text>Active</Text>
										)}
									</TableCell>
									<TableCell>
										<Text>
											{watchedRepositories.has(repository.name)
												? "Watching"
												: "Not watching"}
										</Text>
									</TableCell>
									<TableCell>
										<Text>{formatRepositoryPushedAt(repository.pushedAt)}</Text>
									</TableCell>
									<TableCell>
										<RepositoryStatusBadge status={repositoryStatus} />
									</TableCell>
									<TableCell onClick={(event) => event.stopPropagation()}>
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
						})
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
