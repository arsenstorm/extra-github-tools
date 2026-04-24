import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import type { GitHubAccount } from "@/github";

export function OrganizationsTable({
	accounts,
	onSelect,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	onSelect: (organizationHandle: string) => void;
}>) {
	return (
		<Table>
			<TableHead>
				<TableRow>
					<TableHeader>ID</TableHeader>
					<TableHeader>Avatar</TableHeader>
					<TableHeader>Name</TableHeader>
				</TableRow>
			</TableHead>
			<TableBody>
				{accounts && accounts.length > 0 ? (
					accounts.map((account) => (
						<TableRow
							className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
							key={account.handle}
							onClick={() => onSelect(account.handle)}
						>
							<TableCell className="font-medium">{account.id}</TableCell>
							<TableCell>
								<img
									alt={account.handle}
									className="size-8 rounded-full"
									height={32}
									src={account.avatar}
									width={32}
								/>
							</TableCell>
							<TableCell>
								<Text>{account.handle}</Text>
							</TableCell>
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell className="text-center" colSpan={3}>
							No GitHub accounts found.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}
