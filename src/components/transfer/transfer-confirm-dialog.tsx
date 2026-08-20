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
import { Field, FieldGroup, Fieldset, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import { formatRepositoryCount } from "@/format";
import type {
	GitHubRepository,
	TransferRepositoryArchiveState,
	TransferRepositoryVisibility,
} from "@/github/types";
import {
	REPOSITORY_ARCHIVE_STATE_OPTIONS,
	REPOSITORY_VISIBILITY_OPTIONS,
	type RepositoryTransferOptions,
} from "./types";
import {
	getPostTransferSettingsSummary,
	getTransferredRepositoryName,
} from "./utils";

export function TransferConfirmDialog({
	confirmationValue,
	from,
	isTransferring,
	onCancel,
	onChangeConfirmationValue,
	onChangeOptions,
	onConfirm,
	open,
	options,
	repositories,
	to,
}: Readonly<{
	confirmationValue: string;
	from: string;
	isTransferring: boolean;
	onCancel: () => void;
	onChangeConfirmationValue: (value: string) => void;
	onChangeOptions: (options: RepositoryTransferOptions) => void;
	onConfirm: () => void;
	open: boolean;
	options: RepositoryTransferOptions;
	repositories: GitHubRepository[];
	to: string;
}>) {
	const hasPostTransferSettings =
		options.visibility !== "current" || options.archiveState !== "current";
	const requiresConfirmation = requiresRepositoryConfirmation(
		repositories.length
	);
	const isConfirmed = !requiresConfirmation || confirmationValue === to;
	const canConfirm = repositories.length > 0 && !isTransferring && isConfirmed;

	const updateOption = <Key extends keyof RepositoryTransferOptions>(
		key: Key,
		value: RepositoryTransferOptions[Key]
	): void => onChangeOptions({ ...options, [key]: value });

	const handleClose = (): void => {
		if (!isTransferring) {
			onCancel();
		}
	};

	return (
		<Dialog onClose={handleClose} open={open} size="xl">
			<DialogTitle>Transfer repositories</DialogTitle>
			<DialogDescription>
				You are about to transfer {formatRepositoryCount(repositories.length)}{" "}
				from <Strong>{from}</Strong> to <Strong>{to}</Strong>.
			</DialogDescription>
			<DialogBody>
				<Fieldset>
					<FieldGroup className="grid gap-4 sm:grid-cols-2">
						<Field>
							<Label>Name prefix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) =>
									updateOption("namePrefix", event.target.value)
								}
								placeholder="archived-"
								value={options.namePrefix}
							/>
						</Field>
						<Field>
							<Label>Name suffix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) =>
									updateOption("nameSuffix", event.target.value)
								}
								placeholder="-migrated"
								value={options.nameSuffix}
							/>
						</Field>
						<Field>
							<Label>Visibility after transfer</Label>
							<RepositorySelect<TransferRepositoryVisibility>
								ariaLabel="Visibility after transfer"
								disabled={isTransferring}
								onChange={(value) => updateOption("visibility", value)}
								options={REPOSITORY_VISIBILITY_OPTIONS}
								value={options.visibility}
							/>
						</Field>
						<Field>
							<Label>Archive state after transfer</Label>
							<RepositorySelect<TransferRepositoryArchiveState>
								ariaLabel="Archive state after transfer"
								disabled={isTransferring}
								onChange={(value) => updateOption("archiveState", value)}
								options={REPOSITORY_ARCHIVE_STATE_OPTIONS}
								value={options.archiveState}
							/>
						</Field>
					</FieldGroup>
				</Fieldset>
				<RepositoryPreviewList className="mt-6">
					{repositories.map((repository) => {
						const transferredRepositoryName = getTransferredRepositoryName(
							repository.name,
							options
						);

						return (
							<RepositoryPreviewItem key={repository.id} name={repository.name}>
								{transferredRepositoryName === repository.name ? null : (
									<Text className="mt-1">→ {transferredRepositoryName}</Text>
								)}
							</RepositoryPreviewItem>
						);
					})}
				</RepositoryPreviewList>
				{hasPostTransferSettings ? (
					<Text className="mt-4">
						Post-transfer settings: {getPostTransferSettingsSummary(options)}.
					</Text>
				) : null}
				{requiresConfirmation ? (
					<ConfirmationField
						account={to}
						className="mt-4"
						disabled={isTransferring}
						onChange={onChangeConfirmationValue}
						runNoun="transfers"
						value={confirmationValue}
					/>
				) : null}
			</DialogBody>
			<DialogActions>
				<Button disabled={isTransferring} onClick={onCancel} outline>
					Cancel
				</Button>
				<Button color="red" disabled={!canConfirm} onClick={onConfirm}>
					{isTransferring ? "Transferring..." : "Transfer repositories"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
