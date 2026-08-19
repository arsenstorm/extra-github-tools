import { RepositorySelect } from "@/components/repositories/select";
import { Button } from "@/components/ui/button";
import {
	Description,
	Field,
	FieldGroup,
	Fieldset,
	Label,
} from "@/components/ui/fieldset";
import { Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import type {
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
} from "./utils";

export function ManageSettingsPanel({
	actions,
	isManaging,
	onApplyToSelection,
	onChangeArchiveAction,
	onChangeSubscriptionAction,
	onChangeVisibilityAction,
	selectedRepositoryCount,
	supportsInternalVisibility,
}: Readonly<{
	actions: ManageRepositoryActions;
	isManaging: boolean;
	onApplyToSelection: () => void;
	onChangeArchiveAction: (value: ManageRepositoryArchiveAction) => void;
	onChangeSubscriptionAction: (
		value: ManageRepositorySubscriptionAction
	) => void;
	onChangeVisibilityAction: (value: ManageRepositoryVisibilityAction) => void;
	selectedRepositoryCount: number;
	supportsInternalVisibility: boolean;
}>) {
	const actionsSummary = getManageActionsSummary(actions);
	const canApply =
		!isManaging && actionsSummary.length > 0 && selectedRepositoryCount > 0;

	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<Subheading>Bulk edit</Subheading>
			<Text className="mt-1">
				Set the same values on every selected repository. You can also edit each
				row on its own.
			</Text>
			<Fieldset className="mt-4">
				<FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<Field>
						<Label>Archived state</Label>
						<RepositorySelect<ManageRepositoryArchiveAction>
							ariaLabel="Archived state"
							disabled={isManaging}
							onChange={onChangeArchiveAction}
							options={MANAGE_ARCHIVE_ACTION_OPTIONS}
							value={actions.archiveAction}
						/>
						<Description>
							Archived repositories become read-only and stop sending security
							alerts.
						</Description>
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
						<Description>
							{supportsInternalVisibility
								? "Internal repositories are visible to everyone in the organization."
								: "Internal is only available in organizations on GitHub Enterprise."}
						</Description>
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
						<Description>
							Changes only your own subscription for each repository.
						</Description>
					</Field>
				</FieldGroup>
			</Fieldset>
			<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Text>
					{actionsSummary
						? `Apply will: ${actionsSummary}.`
						: "Pick a setting to apply to the selected repositories."}
				</Text>
				<Button disabled={!canApply} onClick={onApplyToSelection} outline>
					Apply to {selectedRepositoryCount} selected
				</Button>
			</div>
		</section>
	);
}
