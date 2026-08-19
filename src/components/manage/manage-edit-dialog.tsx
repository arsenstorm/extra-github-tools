import { CONFIRMATION_REQUIRED_REPOSITORY_COUNT } from "@/components/repositories/list-types";
import { RepositorySelect } from "@/components/repositories/select";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogActions,
	DialogBody,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Description, Field, Fieldset, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryArchiveAction,
	ManageRepositorySubscriptionAction,
	ManageRepositoryVisibilityAction,
} from "@/github";
import {
	MANAGE_ARCHIVE_ACTION_OPTIONS,
	MANAGE_SUBSCRIPTION_ACTION_OPTIONS,
} from "./types";
import {
	getManageActionsSummary,
	getManageVisibilityActionOptions,
	getRepositoryChangeLines,
} from "./utils";

export function ManageEditDialog({
	account,
	actions,
	confirmationValue,
	isManaging,
	onCancel,
	onChangeArchiveAction,
	onChangeConfirmationValue,
	onChangeSubscriptionAction,
	onChangeVisibilityAction,
	onConfirm,
	open,
	repositories,
	supportsInternalVisibility,
	watchedRepositories,
}: Readonly<{
	account: string;
	actions: ManageRepositoryActions;
	confirmationValue: string;
	isManaging: boolean;
	onCancel: () => void;
	onChangeArchiveAction: (value: ManageRepositoryArchiveAction) => void;
	onChangeConfirmationValue: (value: string) => void;
	onChangeSubscriptionAction: (
		value: ManageRepositorySubscriptionAction
	) => void;
	onChangeVisibilityAction: (value: ManageRepositoryVisibilityAction) => void;
	onConfirm: () => void;
	open: boolean;
	repositories: GitHubRepository[];
	supportsInternalVisibility: boolean;
	watchedRepositories: Set<string>;
}>) {
	const actionsSummary = getManageActionsSummary(actions);
	const hasChosenAction = actionsSummary.length > 0;
	const requiresConfirmation =
		repositories.length >= CONFIRMATION_REQUIRED_REPOSITORY_COUNT;
	const canConfirm =
		hasChosenAction &&
		!isManaging &&
		(!requiresConfirmation || confirmationValue === account);

	return (
		<Dialog onClose={onCancel} open={open} size="xl">
			<DialogTitle>Edit repository settings</DialogTitle>
			<DialogDescription>
				Changes apply to {repositories.length}{" "}
				{repositories.length === 1 ? "repository" : "repositories"} in{" "}
				<Strong>{account}</Strong>.
			</DialogDescription>
			<Fieldset className="mt-6">
				<div className="grid gap-4 sm:grid-cols-3">
					<Field>
						<Label>Archived state</Label>
						<RepositorySelect<ManageRepositoryArchiveAction>
							ariaLabel="Archived state"
							disabled={isManaging}
							onChange={onChangeArchiveAction}
							options={MANAGE_ARCHIVE_ACTION_OPTIONS}
							value={actions.archiveAction}
						/>
					</Field>
					<Field>
						<Label>Visibility</Label>
						<RepositorySelect<ManageRepositoryVisibilityAction>
							ariaLabel="Visibility"
							disabled={isManaging}
							onChange={onChangeVisibilityAction}
							options={getManageVisibilityActionOptions(
								supportsInternalVisibility
							)}
							value={actions.visibilityAction}
						/>
					</Field>
					<Field>
						<Label>Notifications</Label>
						<RepositorySelect<ManageRepositorySubscriptionAction>
							ariaLabel="Notifications"
							disabled={isManaging}
							onChange={onChangeSubscriptionAction}
							options={MANAGE_SUBSCRIPTION_ACTION_OPTIONS}
							value={actions.subscriptionAction}
						/>
					</Field>
				</div>
			</Fieldset>
			<DialogBody>
				<Text className="mb-3">
					{hasChosenAction
						? `This will ${actionsSummary}.`
						: "Pick at least one setting to change."}
				</Text>
				<ul className="divide-y divide-zinc-950/10 rounded-lg border border-zinc-950/10 dark:divide-white/10 dark:border-white/10">
					{repositories.map((repository) => {
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
