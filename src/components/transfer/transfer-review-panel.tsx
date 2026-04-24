import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Description, Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type { GitHubRepository } from "@/github";
import {
	CONFIRMATION_REQUIRED_REPOSITORY_COUNT,
	type RepositoryTransferOptions,
} from "./types";
import {
	getPostTransferSettingsSummary,
	getTransferredRepositoryName,
} from "./utils";

export function TransferReviewPanel({
	confirmationValue,
	from,
	isTransferring,
	onCancel,
	onChangeConfirmationValue,
	onConfirm,
	repositories,
	selectedRepositories,
	to,
	transferOptions,
}: Readonly<{
	confirmationValue: string;
	from: string;
	isTransferring: boolean;
	onCancel: () => void;
	onChangeConfirmationValue: (value: string) => void;
	onConfirm: () => void;
	repositories: GitHubRepository[];
	selectedRepositories: string[];
	to: string;
	transferOptions: RepositoryTransferOptions;
}>) {
	const selectedRepositorySet = new Set(selectedRepositories);
	const selectedRepositoryRows = repositories.filter((repository) =>
		selectedRepositorySet.has(repository.name)
	);
	const requiresConfirmation =
		selectedRepositories.length >= CONFIRMATION_REQUIRED_REPOSITORY_COUNT;
	const canConfirm =
		selectedRepositories.length > 0 &&
		!isTransferring &&
		(!requiresConfirmation || confirmationValue === to);

	return (
		<section className="fixed right-0 bottom-4 left-0 z-50 mx-auto max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto rounded-lg border border-red-200 bg-red-50/95 p-4 shadow-lg backdrop-blur-md dark:border-red-500/30 dark:bg-zinc-950/95">
			<div className="flex items-start gap-3">
				<CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
				<div className="min-w-0 flex-1">
					<Strong>Review transfer</Strong>
					<Text className="mt-1">
						You are about to transfer {selectedRepositories.length}{" "}
						{selectedRepositories.length === 1 ? "repository" : "repositories"}{" "}
						from <Strong>{from}</Strong> to <Strong>{to}</Strong>.
					</Text>
					<Text className="mt-1">
						Post-transfer settings:{" "}
						{getPostTransferSettingsSummary(transferOptions)}.
					</Text>
					<div className="mt-4 max-h-52 overflow-y-auto rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-950">
						<ul className="divide-y divide-zinc-950/10 dark:divide-white/10">
							{selectedRepositoryRows.map((repository) => (
								<li className="px-3 py-2" key={repository.id}>
									<Strong>{repository.name}</Strong>
									<Text className="mt-1">
										{repository.fullName} to{" "}
										{getTransferredRepositoryName(
											repository.name,
											transferOptions
										)}
									</Text>
								</li>
							))}
						</ul>
					</div>
					{requiresConfirmation ? (
						<Field className="mt-4">
							<Label>Type {to} to confirm</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) =>
									onChangeConfirmationValue(event.target.value)
								}
								value={confirmationValue}
							/>
							<Description>
								This confirmation is required for transfers of{" "}
								{CONFIRMATION_REQUIRED_REPOSITORY_COUNT} or more repositories.
							</Description>
						</Field>
					) : null}
					<div className="mt-4 flex flex-wrap gap-2">
						<Button color="red" disabled={!canConfirm} onClick={onConfirm}>
							{isTransferring ? "Transferring..." : "Transfer repositories"}
						</Button>
						<Button disabled={isTransferring} onClick={onCancel} outline>
							Cancel
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
