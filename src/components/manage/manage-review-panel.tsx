import { CircleAlert } from "lucide-react";
import { CONFIRMATION_REQUIRED_REPOSITORY_COUNT } from "@/components/repositories/list-types";
import { Button } from "@/components/ui/button";
import { Description, Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type { GitHubRepository, ManageRepositoryActions } from "@/github";
import { getRepositoryChangeLines } from "./utils";

export function ManageReviewPanel({
	account,
	actions,
	confirmationValue,
	isManaging,
	onCancel,
	onChangeConfirmationValue,
	onConfirm,
	repositories,
	selectedRepositories,
	watchedRepositories,
}: Readonly<{
	account: string;
	actions: ManageRepositoryActions;
	confirmationValue: string;
	isManaging: boolean;
	onCancel: () => void;
	onChangeConfirmationValue: (value: string) => void;
	onConfirm: () => void;
	repositories: GitHubRepository[];
	selectedRepositories: string[];
	watchedRepositories: Set<string>;
}>) {
	const selectedRepositorySet = new Set(selectedRepositories);
	const selectedRepositoryRows = repositories.filter((repository) =>
		selectedRepositorySet.has(repository.name)
	);
	const requiresConfirmation =
		selectedRepositories.length >= CONFIRMATION_REQUIRED_REPOSITORY_COUNT;
	const canConfirm =
		selectedRepositories.length > 0 &&
		!isManaging &&
		(!requiresConfirmation || confirmationValue === account);

	return (
		<section className="fixed right-0 bottom-4 left-0 z-50 mx-auto max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-red-200 bg-red-50/95 p-4 shadow-lg backdrop-blur-md dark:border-red-500/30 dark:bg-zinc-950/95">
			<div className="flex items-start gap-3">
				<CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
				<div className="min-w-0 flex-1">
					<Strong>Review changes</Strong>
					<Text className="mt-1">
						You are about to update {selectedRepositories.length}{" "}
						{selectedRepositories.length === 1 ? "repository" : "repositories"}{" "}
						in <Strong>{account}</Strong>.
					</Text>
					<div className="mt-4 max-h-52 overflow-y-auto rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-950">
						<ul className="divide-y divide-zinc-950/10 dark:divide-white/10">
							{selectedRepositoryRows.map((repository) => {
								const changeLines = getRepositoryChangeLines(
									repository,
									actions,
									watchedRepositories
								);

								return (
									<li className="px-3 py-2" key={repository.id}>
										<Strong>{repository.name}</Strong>
										{changeLines.length > 0 ? (
											changeLines.map((changeLine) => (
												<Text className="mt-1" key={changeLine}>
													{changeLine}
												</Text>
											))
										) : (
											<Text className="mt-1">No change needed.</Text>
										)}
									</li>
								);
							})}
						</ul>
					</div>
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
					<div className="mt-4 flex flex-wrap gap-2">
						<Button color="red" disabled={!canConfirm} onClick={onConfirm}>
							{isManaging ? "Updating..." : "Update repositories"}
						</Button>
						<Button disabled={isManaging} onClick={onCancel} outline>
							Cancel
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
