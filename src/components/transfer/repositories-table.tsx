import { Checkbox } from "@headlessui/react";
import { type KeyboardEvent, useRef } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Strong, Text, TextLink } from "@/components/ui/text";
import type { GitHubRepository, TransferRepositoryResult } from "@/github";
import type { RepositoryStatus } from "./types";
import { formatRepositoryPushedAt, getRepositoryStatus } from "./utils";

export function RepositoriesTable({
	filteredRepositories,
	isTransferring,
	onToggle,
	pendingRepositories,
	resultsByRepository,
	selectedRepositories,
}: Readonly<{
	filteredRepositories: GitHubRepository[];
	isTransferring: boolean;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	pendingRepositories: Set<string>;
	resultsByRepository: Map<string, TransferRepositoryResult>;
	selectedRepositories: Set<string>;
}>) {
	const checkboxShouldSelectRangeRef = useRef(false);

	const handleRowKeyDown = (
		event: KeyboardEvent<HTMLTableRowElement>,
		repositoryName: string
	): void => {
		if (event.target !== event.currentTarget) {
			return;
		}

		if (isTransferring) {
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
						<TableHeader>Select</TableHeader>
						<TableHeader>Name</TableHeader>
						<TableHeader>Visibility</TableHeader>
						<TableHeader>Type</TableHeader>
						<TableHeader>Last pushed</TableHeader>
						<TableHeader>Status</TableHeader>
						<TableHeader>Actions</TableHeader>
					</TableRow>
				</TableHead>
				<TableBody>
					{filteredRepositories.length > 0 ? (
						filteredRepositories.map((repository) => {
							const repositoryStatus = getRepositoryStatus(
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
										if (!isTransferring) {
											onToggle(repository.name, event.shiftKey);
										}
									}}
									onKeyDown={(event) =>
										handleRowKeyDown(event, repository.name)
									}
									tabIndex={0}
								>
									<TableCell>
										<Checkbox
											aria-label={`Select ${repository.name}`}
											checked={selectedRepositories.has(repository.name)}
											className="group block size-4 rounded border bg-white data-checked:bg-zinc-500 data-disabled:opacity-50"
											disabled={isTransferring}
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
										<div>
											<Strong>{repository.name}</Strong>
											<Text className="mt-1">{repository.fullName}</Text>
										</div>
									</TableCell>
									<TableCell>
										<RepositoryBadge>
											{repository.private ? "Private" : "Public"}
										</RepositoryBadge>
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											{repository.fork ? (
												<RepositoryBadge>Fork</RepositoryBadge>
											) : null}
											{repository.archived ? (
												<RepositoryBadge>Archived</RepositoryBadge>
											) : null}
											{repository.fork || repository.archived ? null : (
												<Text>Source</Text>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Text>{formatRepositoryPushedAt(repository.pushedAt)}</Text>
									</TableCell>
									<TableCell>
										<RepositoryStatusBadge status={repositoryStatus} />
									</TableCell>
									<TableCell>
										<Text>
											<TextLink
												href={repository.htmlUrl}
												onClick={(event) => event.stopPropagation()}
												rel="noopener noreferrer"
												target="_blank"
											>
												View on GitHub
											</TextLink>
										</Text>
									</TableCell>
								</TableRow>
							);
						})
					) : (
						<TableRow>
							<TableCell className="text-center" colSpan={7}>
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
	status: RepositoryStatus;
}>) {
	if (status === "idle") {
		return <Text>Not queued</Text>;
	}

	const labelByStatus = {
		failed: "Failed",
		pending: "Pending",
		transferred: "Transferred",
	} as const;
	const classNameByStatus = {
		failed:
			"border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
		pending:
			"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
		transferred:
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
