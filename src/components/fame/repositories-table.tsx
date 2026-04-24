import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Text, TextLink } from "@/components/ui/text";
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
					<TableHeader>Full Name</TableHeader>
					<TableHeader>Actions</TableHeader>
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
							<TableCell>
								<Text>{repository.fullName}</Text>
							</TableCell>
							<TableCell>
								<Text>
									<TextLink
										href={repository.htmlUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										View on GitHub
									</TextLink>
								</Text>
							</TableCell>
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell className="text-center" colSpan={4}>
							No repositories found.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
