import { CONFIRMATION_REQUIRED_REPOSITORY_COUNT } from "@/components/repositories/list-types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogActions,
	DialogBody,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Description, Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type { GitHubRepository } from "@/github";
import { getPendingChangeLines, type RepositoryPendingChange } from "./utils";

export function ManageConfirmDialog({
	account,
	confirmationValue,
	isManaging,
	onCancel,
	onChangeConfirmationValue,
	onConfirm,
	open,
	pendingChanges,
	repositories,
	watchedRepositories,
}: Readonly<{
	account: string;
	confirmationValue: string;
	isManaging: boolean;
	onCancel: () => void;
	onChangeConfirmationValue: (value: string) => void;
	onConfirm: () => void;
	open: boolean;
	pendingChanges: ReadonlyMap<string, RepositoryPendingChange>;
	repositories: GitHubRepository[];
	watchedRepositories: Set<string>;
}>) {
	const pendingRepositories = repositories.filter((repository) =>
		pendingChanges.has(repository.name)
	);
	const requiresConfirmation =
		pendingChanges.size >= CONFIRMATION_REQUIRED_REPOSITORY_COUNT;
	const canConfirm =
		pendingChanges.size > 0 &&
		!isManaging &&
		(!requiresConfirmation || confirmationValue === account);

	return (
		<Dialog onClose={onCancel} open={open} size="xl">
			<DialogTitle>Update repositories</DialogTitle>
			<DialogDescription>
				You are about to update {pendingChanges.size}{" "}
				{pendingChanges.size === 1 ? "repository" : "repositories"} in{" "}
				<Strong>{account}</Strong>.
			</DialogDescription>
			<DialogBody>
				<ul className="divide-y divide-zinc-950/10 rounded-lg border border-zinc-950/10 dark:divide-white/10 dark:border-white/10">
					{pendingRepositories.map((repository) => {
						const changeLines = getPendingChangeLines(
							repository,
							pendingChanges.get(repository.name) ?? {},
							watchedRepositories
						);

						return (
							<li className="px-3 py-2" key={repository.id}>
								<Strong>{repository.name}</Strong>
								{changeLines.map((changeLine) => (
									<Text className="mt-1" key={changeLine}>
										{changeLine}
									</Text>
								))}
							</li>
						);
					})}
				</ul>
				{requiresConfirmation ? (
					<Field className="mt-4">
						<Label>Type {account} to confirm</Label>
						<Input
							disabled={isManaging}
							onChange={(event) =>
								onChangeConfirmationValue(event.target.value)
							}
							value={confirmationValue}
						/>
						<Description>
							This confirmation is required for runs of{" "}
							{CONFIRMATION_REQUIRED_REPOSITORY_COUNT} or more repositories.
						</Description>
					</Field>
				) : null}
			</DialogBody>
			<DialogActions>
				<Button disabled={isManaging} onClick={onCancel} outline>
					Cancel
				</Button>
				<Button color="red" disabled={!canConfirm} onClick={onConfirm}>
					Update repositories
				</Button>
			</DialogActions>
		</Dialog>
	);
}
