import { RepositoryActionsMenu } from "@/components/repositories/actions-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import type { GitHubRepository } from "@/github";

export function RepositoriesTable({
	onSelect,
	repositories,
}: Readonly<{
	onSelect: (repositoryName: string) => void;
	repositories: GitHubRepository[] | null;
}>) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader>ID</TableHeader>
					<TableHeader>Name</TableHeader>
					<TableHeader className="w-0">
						<span className="sr-only">Actions</span>
					</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{repositories && repositories.length > 0 ? (
					repositories.map((repository) => (
						<TableRow
							className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
							key={repository.id}
							onClick={() => onSelect(repository.name)}
						>
							<TableCell className="font-medium">{repository.id}</TableCell>
							<TableCell>
								<Text>{repository.name}</Text>
							</TableCell>
							<TableCell onClick={(event) => event.stopPropagation()}>
								<RepositoryActionsMenu
									htmlUrl={repository.htmlUrl}
									repositoryName={repository.name}
								/>
							</TableCell>
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell className="text-center" colSpan={3}>
							No repositories found.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
