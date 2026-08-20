import {
	ConfirmationField,
	requiresRepositoryConfirmation,
} from "@/components/repositories/confirmation-field";
import {
	RepositoryPreviewItem,
	RepositoryPreviewList,
} from "@/components/repositories/preview-list";
import { RepositorySelect } from "@/components/repositories/select";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogActions,
	DialogBody,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, Fieldset, Label } from "@/components/ui/fieldset";
import { Strong, Text } from "@/components/ui/text";
import { formatRepositoryCount } from "@/format";
import type { GitHubRepository, ManageRepositoryActions } from "@/github/types";
import {
	MANAGE_ARCHIVE_ACTION_OPTIONS,
	MANAGE_SUBSCRIPTION_ACTION_OPTIONS,
} from "./types";
import {
	getManageActionsSummary,
	getManageVisibilityActionOptions,
	getRepositoryChangeLines,
	hasManageAction,
} from "./utils";

export function ManageEditDialog({
	account,
	actions,
	confirmationValue,
	isManaging,
	onCancel,
	onChangeActions,
	onChangeConfirmationValue,
	onConfirm,
	open,
	repositories,
	supportsInternalVisibility,
}: Readonly<{
	account: string;
	actions: ManageRepositoryActions;
	confirmationValue: string;
	isManaging: boolean;
	onCancel: () => void;
	onChangeActions: (actions: ManageRepositoryActions) => void;
	onChangeConfirmationValue: (value: string) => void;
	onConfirm: () => void;
	open: boolean;
	repositories: GitHubRepository[];
	supportsInternalVisibility: boolean;
}>) {
	const hasChosenAction = hasManageAction(actions);
	const requiresConfirmation = requiresRepositoryConfirmation(
		repositories.length
	);
	const isConfirmed = !requiresConfirmation || confirmationValue === account;
	const canConfirm = hasChosenAction && !isManaging && isConfirmed;

	return (
		<Dialog onClose={onCancel} open={open} size="xl">
			<DialogTitle>Edit repository settings</DialogTitle>
			<DialogDescription>
				Changes apply to {formatRepositoryCount(repositories.length)} in{" "}
				<Strong>{account}</Strong>.
			</DialogDescription>
			<Fieldset className="mt-6">
				<div className="grid gap-4 sm:grid-cols-3">
					<ActionField
						actionKey="archiveAction"
						actions={actions}
						disabled={isManaging}
						label="Archived state"
						onChange={onChangeActions}
						options={MANAGE_ARCHIVE_ACTION_OPTIONS}
					/>
					<ActionField
						actionKey="visibilityAction"
						actions={actions}
						disabled={isManaging}
						label="Visibility"
						onChange={onChangeActions}
						options={getManageVisibilityActionOptions(
							supportsInternalVisibility
						)}
					/>
					<ActionField
						actionKey="subscriptionAction"
						actions={actions}
						disabled={isManaging}
						label="Notifications"
						onChange={onChangeActions}
						options={MANAGE_SUBSCRIPTION_ACTION_OPTIONS}
					/>
				</div>
			</Fieldset>
			<DialogBody>
				<Text className="mb-3">
					{hasChosenAction
						? `This will ${getManageActionsSummary(actions)}.`
						: "Pick at least one setting to change."}
				</Text>
				<RepositoryPreviewList>
					{repositories.map((repository) => (
						<RepositoryChangePreview
							actions={actions}
							key={repository.id}
							repository={repository}
						/>
					))}
				</RepositoryPreviewList>
				{requiresConfirmation ? (
					<ConfirmationField
						account={account}
						className="mt-4"
						disabled={isManaging}
						onChange={onChangeConfirmationValue}
						runNoun="runs"
						value={confirmationValue}
					/>
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

function ActionField<Key extends keyof ManageRepositoryActions>({
	actionKey,
	actions,
	disabled,
	label,
	onChange,
	options,
}: Readonly<{
	actionKey: Key;
	actions: ManageRepositoryActions;
	disabled: boolean;
	label: string;
	onChange: (actions: ManageRepositoryActions) => void;
	options: ReadonlyArray<{
		label: string;
		value: ManageRepositoryActions[Key];
	}>;
}>) {
	return (
		<Field>
			<Label>{label}</Label>
			<RepositorySelect<ManageRepositoryActions[Key]>
				ariaLabel={label}
				disabled={disabled}
				onChange={(value) => onChange({ ...actions, [actionKey]: value })}
				options={options}
				value={actions[actionKey]}
			/>
		</Field>
	);
}

function RepositoryChangePreview({
	actions,
	repository,
}: Readonly<{
	actions: ManageRepositoryActions;
	repository: GitHubRepository;
}>) {
	const changeLines = getRepositoryChangeLines(repository, actions);

	return (
		<RepositoryPreviewItem name={repository.name}>
			{changeLines.length > 0 ? (
				changeLines.map((changeLine) => (
					<Text className="mt-1" key={changeLine}>
						{changeLine}
					</Text>
				))
			) : (
				<Text className="mt-1">No change needed.</Text>
			)}
		</RepositoryPreviewItem>
	);
}
