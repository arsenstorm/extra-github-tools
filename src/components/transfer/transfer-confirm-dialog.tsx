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
import {
	Description,
	Field,
	FieldGroup,
	Fieldset,
	Label,
} from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Strong, Text } from "@/components/ui/text";
import type {
	GitHubRepository,
	TransferRepositoryArchiveState,
	TransferRepositoryVisibility,
} from "@/github";
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
	archiveState,
	confirmationValue,
	from,
	isTransferring,
	namePrefix,
	nameSuffix,
	onCancel,
	onChangeArchiveState,
	onChangeConfirmationValue,
	onChangeNamePrefix,
	onChangeNameSuffix,
	onChangeVisibility,
	onConfirm,
	open,
	repositories,
	selectedRepositories,
	to,
	visibility,
}: Readonly<{
	archiveState: TransferRepositoryArchiveState;
	confirmationValue: string;
	from: string;
	isTransferring: boolean;
	namePrefix: string;
	nameSuffix: string;
	onCancel: () => void;
	onChangeArchiveState: (value: TransferRepositoryArchiveState) => void;
	onChangeConfirmationValue: (value: string) => void;
	onChangeNamePrefix: (value: string) => void;
	onChangeNameSuffix: (value: string) => void;
	onChangeVisibility: (value: TransferRepositoryVisibility) => void;
	onConfirm: () => void;
	open: boolean;
	repositories: GitHubRepository[];
	selectedRepositories: string[];
	to: string;
	visibility: TransferRepositoryVisibility;
}>) {
	const transferOptions: RepositoryTransferOptions = {
		archiveState,
		namePrefix,
		nameSuffix,
		visibility,
	};
	const selectedRepositorySet = new Set(selectedRepositories);
	const selectedRepositoryRows = repositories.filter((repository) =>
		selectedRepositorySet.has(repository.name)
	);
	const hasPostTransferSettings =
		visibility !== "current" || archiveState !== "current";
	const requiresConfirmation =
		selectedRepositories.length >= CONFIRMATION_REQUIRED_REPOSITORY_COUNT;
	const canConfirm =
		selectedRepositories.length > 0 &&
		!isTransferring &&
		(!requiresConfirmation || confirmationValue === to);

	const handleClose = (): void => {
		if (isTransferring) {
			return;
		}

		onCancel();
	};

	return (
		<Dialog onClose={handleClose} open={open} size="xl">
			<DialogTitle>Transfer repositories</DialogTitle>
			<DialogDescription>
				You are about to transfer {selectedRepositories.length}{" "}
				{selectedRepositories.length === 1 ? "repository" : "repositories"} from{" "}
				<Strong>{from}</Strong> to <Strong>{to}</Strong>.
			</DialogDescription>
			<DialogBody>
				<Fieldset>
					<FieldGroup className="grid gap-4 sm:grid-cols-2">
						<Field>
							<Label>Name prefix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) => onChangeNamePrefix(event.target.value)}
								placeholder="archived-"
								value={namePrefix}
							/>
						</Field>
						<Field>
							<Label>Name suffix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) => onChangeNameSuffix(event.target.value)}
								placeholder="-migrated"
								value={nameSuffix}
							/>
						</Field>
						<Field>
							<Label>Visibility after transfer</Label>
							<RepositorySelect<TransferRepositoryVisibility>
								ariaLabel="Visibility after transfer"
								disabled={isTransferring}
								onChange={onChangeVisibility}
								options={REPOSITORY_VISIBILITY_OPTIONS}
								value={visibility}
							/>
						</Field>
						<Field>
							<Label>Archive state after transfer</Label>
							<RepositorySelect<TransferRepositoryArchiveState>
								ariaLabel="Archive state after transfer"
								disabled={isTransferring}
								onChange={onChangeArchiveState}
								options={REPOSITORY_ARCHIVE_STATE_OPTIONS}
								value={archiveState}
							/>
						</Field>
					</FieldGroup>
				</Fieldset>
				<ul className="mt-6 divide-y divide-zinc-950/10 rounded-lg border border-zinc-950/10 dark:divide-white/10 dark:border-white/10">
					{selectedRepositoryRows.map((repository) => {
						const transferredRepositoryName = getTransferredRepositoryName(
							repository.name,
							transferOptions
						);

						return (
							<li className="px-3 py-2" key={repository.id}>
								<Strong>{repository.name}</Strong>
								{transferredRepositoryName === repository.name ? null : (
									<Text className="mt-1">→ {transferredRepositoryName}</Text>
								)}
							</li>
						);
					})}
				</ul>
				{hasPostTransferSettings ? (
					<Text className="mt-4">
						Post-transfer settings:{" "}
						{getPostTransferSettingsSummary(transferOptions)}.
					</Text>
				) : null}
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
