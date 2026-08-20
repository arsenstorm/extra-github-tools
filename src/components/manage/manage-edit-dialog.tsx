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

/** Picks settings for a selection of repositories; confirming stages them for review. */
export function ManageEditDialog({
	account,
	actions,
	onCancel,
	onChangeActions,
	onConfirm,
	open,
	repositories,
	supportsInternalVisibility,
}: Readonly<{
	account: string;
	actions: ManageRepositoryActions;
	onCancel: () => void;
	onChangeActions: (actions: ManageRepositoryActions) => void;
	onConfirm: () => void;
	open: boolean;
	repositories: GitHubRepository[];
	supportsInternalVisibility: boolean;
}>) {
	const hasChosenAction = hasManageAction(actions);

	return (
		<Dialog onClose={onCancel} open={open} size="xl">
			<DialogTitle>Edit repository settings</DialogTitle>
			<DialogDescription>
				Changes apply to {formatRepositoryCount(repositories.length)} in{" "}
				<Strong>{account}</Strong>. Nothing runs until you review them.
			</DialogDescription>
			<Fieldset className="mt-6">
				<div className="grid gap-4 sm:grid-cols-3">
					<ActionField
						actionKey="archiveAction"
						actions={actions}
						label="Archived state"
						onChange={onChangeActions}
						options={MANAGE_ARCHIVE_ACTION_OPTIONS}
					/>
					<ActionField
						actionKey="visibilityAction"
						actions={actions}
						label="Visibility"
						onChange={onChangeActions}
						options={getManageVisibilityActionOptions(
							supportsInternalVisibility
						)}
					/>
					<ActionField
						actionKey="subscriptionAction"
						actions={actions}
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
			</DialogBody>
			<DialogActions>
				<Button onClick={onCancel} outline>
					Cancel
				</Button>
				<Button disabled={!hasChosenAction} onClick={onConfirm}>
					Stage changes
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function ActionField<Key extends keyof ManageRepositoryActions>({
	actionKey,
	actions,
	label,
	onChange,
	options,
}: Readonly<{
	actionKey: Key;
	actions: ManageRepositoryActions;
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
				disabled={false}
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
