import { RepositorySelect } from "@/components/repositories/select";
import {
	Description,
	Field,
	FieldGroup,
	Fieldset,
	Label,
} from "@/components/ui/fieldset";
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
	MANAGE_VISIBILITY_ACTION_OPTIONS,
} from "./types";
import { getManageActionsSummary } from "./utils";

export function ManageSettingsPanel({
	actions,
	isManaging,
	onChangeArchiveAction,
	onChangeSubscriptionAction,
	onChangeVisibilityAction,
}: Readonly<{
	actions: ManageRepositoryActions;
	isManaging: boolean;
	onChangeArchiveAction: (value: ManageRepositoryArchiveAction) => void;
	onChangeSubscriptionAction: (
		value: ManageRepositorySubscriptionAction
	) => void;
	onChangeVisibilityAction: (value: ManageRepositoryVisibilityAction) => void;
}>) {
	const actionsSummary = getManageActionsSummary(actions);

	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<Fieldset>
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
							options={MANAGE_VISIBILITY_ACTION_OPTIONS}
							value={actions.visibilityAction}
						/>
						<Description>
							Internal only works in organizations on GitHub Enterprise.
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
			<Text className="mt-4">
				{actionsSummary
					? `A run will: ${actionsSummary}.`
					: "Pick at least one setting to change."}
			</Text>
		</section>
	);
}
