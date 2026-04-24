import { ChevronDown } from "lucide-react";
import { useState } from "react";
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
	TransferRepositoryArchiveState,
	TransferRepositoryVisibility,
} from "@/github";
import { RepositoryTransferSelect } from "./repository-transfer-select";
import {
	REPOSITORY_ARCHIVE_STATE_OPTIONS,
	REPOSITORY_VISIBILITY_OPTIONS,
} from "./types";
import { getPostTransferSettingsSummary } from "./utils";

export function RepositoryTransferSettingsPanel({
	archiveState,
	hasPostTransferSettings,
	isRenamingRepositories,
	isTransferring,
	namePrefix,
	nameSuffix,
	onChangeArchiveState,
	onChangeNamePrefix,
	onChangeNameSuffix,
	onChangeVisibility,
	previewRepositoryName,
	previewTransferredRepositoryName,
	visibility,
}: Readonly<{
	archiveState: TransferRepositoryArchiveState;
	hasPostTransferSettings: boolean;
	isRenamingRepositories: boolean;
	isTransferring: boolean;
	namePrefix: string;
	nameSuffix: string;
	onChangeArchiveState: (value: TransferRepositoryArchiveState) => void;
	onChangeNamePrefix: (value: string) => void;
	onChangeNameSuffix: (value: string) => void;
	onChangeVisibility: (value: TransferRepositoryVisibility) => void;
	previewRepositoryName: string;
	previewTransferredRepositoryName: string;
	visibility: TransferRepositoryVisibility;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const hasActiveAdvancedOptions =
		isRenamingRepositories || hasPostTransferSettings;

	const handleToggle = (event: React.ToggleEvent<HTMLDetailsElement>): void => {
		setIsOpen(event.currentTarget.open);
	};

	return (
		<details
			className="group rounded-lg border border-zinc-950/10 dark:border-white/10"
			onToggle={handleToggle}
			open={isOpen}
		>
			<summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus:outline-2 focus:outline-blue-500 [&::-webkit-details-marker]:hidden">
				<span>
					<Strong>Advanced options</Strong>
					<Text className="mt-1">
						{hasActiveAdvancedOptions
							? getPostTransferSettingsSummary({
									archiveState,
									namePrefix,
									nameSuffix,
									visibility,
								})
							: "Rename repositories or change post-transfer settings."}
					</Text>
				</span>
				<ChevronDown className="size-4 shrink-0 text-zinc-500 group-open:rotate-180 dark:text-zinc-400" />
			</summary>
			<div className="border-zinc-950/10 border-t p-4 dark:border-white/10">
				<Fieldset>
					<FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Field>
							<Label>Name prefix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) => onChangeNamePrefix(event.target.value)}
								placeholder="archived-"
								value={namePrefix}
							/>
							<Description>
								Added before each selected repository name.
							</Description>
						</Field>
						<Field>
							<Label>Name suffix</Label>
							<Input
								disabled={isTransferring}
								onChange={(event) => onChangeNameSuffix(event.target.value)}
								placeholder="-migrated"
								value={nameSuffix}
							/>
							<Description>
								Added after each selected repository name.
							</Description>
						</Field>
						<Field>
							<Label>Visibility after transfer</Label>
							<RepositoryTransferSelect<TransferRepositoryVisibility>
								ariaLabel="Visibility after transfer"
								disabled={isTransferring}
								onChange={onChangeVisibility}
								options={REPOSITORY_VISIBILITY_OPTIONS}
								value={visibility}
							/>
							<Description>
								Applied after GitHub accepts the transfer.
							</Description>
						</Field>
						<Field>
							<Label>Archive state after transfer</Label>
							<RepositoryTransferSelect<TransferRepositoryArchiveState>
								ariaLabel="Archive state after transfer"
								disabled={isTransferring}
								onChange={onChangeArchiveState}
								options={REPOSITORY_ARCHIVE_STATE_OPTIONS}
								value={archiveState}
							/>
							<Description>
								Applied to each successfully transferred repository.
							</Description>
						</Field>
					</FieldGroup>
				</Fieldset>
				<Text className="mt-4">
					{hasActiveAdvancedOptions ? (
						<>
							Example transfer name: <Strong>{previewRepositoryName}</Strong> to{" "}
							<Strong>{previewTransferredRepositoryName}</Strong>. Settings:{" "}
							{getPostTransferSettingsSummary({
								archiveState,
								namePrefix,
								nameSuffix,
								visibility,
							})}
							.
						</>
					) : (
						"Repository names, visibility, and archive state will stay unchanged."
					)}
				</Text>
			</div>
		</details>
	);
}
