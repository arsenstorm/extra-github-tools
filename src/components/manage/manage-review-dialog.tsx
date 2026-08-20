import { XMarkIcon } from "@heroicons/react/16/solid";
import {
	ConfirmationField,
	requiresRepositoryConfirmation,
} from "@/components/repositories/confirmation-field";
import { RepositoryPreviewList } from "@/components/repositories/preview-list";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogActions,
	DialogBody,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Strong, Text } from "@/components/ui/text";
import { formatRepositoryCount } from "@/format";
import type { GitHubRepository, ManageRepositoryActions } from "@/github/types";
import { ChangeWarning } from "./change-warning";
import {
	getArchivedVisibilityWarning,
	getRepositoryChangeLines,
	type StagedChanges,
} from "./utils";

/** Lists every staged change so the whole batch is confirmed at once. */
export function ManageReviewDialog({
	account,
	confirmationValue,
	isManaging,
	onCancel,
	onChangeConfirmationValue,
	onConfirm,
	onUnstageRepository,
	open,
	repositories,
	stagedChanges,
}: Readonly<{
	account: string;
	confirmationValue: string;
	isManaging: boolean;
	onCancel: () => void;
	onChangeConfirmationValue: (value: string) => void;
	onConfirm: () => void;
	onUnstageRepository: (repositoryName: string) => void;
	open: boolean;
	/** The staged repositories, in list order. */
	repositories: GitHubRepository[];
	stagedChanges: StagedChanges;
}>) {
	const requiresConfirmation = requiresRepositoryConfirmation(
		repositories.length
	);
	const isConfirmed = !requiresConfirmation || confirmationValue === account;
	const canConfirm = repositories.length > 0 && !isManaging && isConfirmed;

	return (
		<Dialog onClose={onCancel} open={open} size="xl">
			<DialogTitle>Review changes</DialogTitle>
			<DialogDescription>
				{formatRepositoryCount(repositories.length)} in{" "}
				<Strong>{account}</Strong> will be updated.
			</DialogDescription>
			<DialogBody>
				{repositories.length > 0 ? (
					<RepositoryPreviewList>
						{repositories.map((repository) => (
							<StagedChangeItem
								actions={stagedChanges.get(repository.name)}
								key={repository.id}
								onUnstage={() => onUnstageRepository(repository.name)}
								repository={repository}
							/>
						))}
					</RepositoryPreviewList>
				) : (
					<Text>No changes left to review.</Text>
				)}
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

function StagedChangeItem({
	actions,
	onUnstage,
	repository,
}: Readonly<{
	actions: ManageRepositoryActions | undefined;
	onUnstage: () => void;
	repository: GitHubRepository;
}>) {
	const changeLines = actions
		? getRepositoryChangeLines(repository, actions)
		: [];
	const warning = actions
		? getArchivedVisibilityWarning(repository, actions)
		: null;

	return (
		<li className="flex items-start justify-between gap-3 px-3 py-2">
			<div>
				<Strong>{repository.name}</Strong>
				{changeLines.map((changeLine) => (
					<Text className="mt-1" key={changeLine}>
						{changeLine}
					</Text>
				))}
				<ChangeWarning warning={warning} />
			</div>
			<Button
				aria-label={`Remove changes for ${repository.name}`}
				className="-mr-1.5 shrink-0"
				onClick={onUnstage}
				plain
			>
				<XMarkIcon />
			</Button>
		</li>
	);
}
