import { FloatingActionBar } from "@/components/repositories/floating-action-bar";
import { Button } from "@/components/ui/button";
import { Strong } from "@/components/ui/text";
import { formatRepositoryCount } from "@/format";

/**
 * Bottom bar for the manage page. Staged changes take precedence: they are
 * reviewed and run from here, while a selection offers the bulk edit form.
 */
export function ManageActionBar({
	isManaging,
	managingRepositoryCount,
	onClearSelection,
	onDiscardChanges,
	onEditSettings,
	onReviewChanges,
	selectedRepositoryCount,
	stagedRepositoryCount,
}: Readonly<{
	isManaging: boolean;
	managingRepositoryCount: number;
	onClearSelection: () => void;
	onDiscardChanges: () => void;
	onEditSettings: () => void;
	onReviewChanges: () => void;
	selectedRepositoryCount: number;
	stagedRepositoryCount: number;
}>) {
	if (isManaging) {
		return (
			<FloatingActionBar
				className="max-w-xl"
				message={
					<>
						Updating{" "}
						<Strong>{formatRepositoryCount(managingRepositoryCount)}</Strong>…
					</>
				}
			>
				<Button disabled>Review changes</Button>
			</FloatingActionBar>
		);
	}

	if (stagedRepositoryCount === 0 && selectedRepositoryCount === 0) {
		return null;
	}

	const hasSelection = selectedRepositoryCount > 0;
	const hasStagedChanges = stagedRepositoryCount > 0;

	return (
		<FloatingActionBar
			className="max-w-2xl"
			message={
				<>
					{hasStagedChanges ? (
						<>
							<Strong>{formatRepositoryCount(stagedRepositoryCount)}</Strong>{" "}
							changed.
						</>
					) : null}
					{hasStagedChanges && hasSelection ? " " : null}
					{hasSelection ? (
						<>
							<Strong>{formatRepositoryCount(selectedRepositoryCount)}</Strong>{" "}
							selected.
						</>
					) : null}
				</>
			}
		>
			{hasStagedChanges ? (
				<Button onClick={onReviewChanges}>Review changes</Button>
			) : null}
			{hasSelection && hasStagedChanges ? (
				<Button onClick={onEditSettings} outline>
					Edit settings
				</Button>
			) : null}
			{hasSelection && !hasStagedChanges ? (
				<Button onClick={onEditSettings}>Edit settings</Button>
			) : null}
			{hasStagedChanges ? (
				<Button onClick={onDiscardChanges} outline>
					Discard changes
				</Button>
			) : null}
			{hasSelection ? (
				<Button onClick={onClearSelection} plain>
					Clear selection
				</Button>
			) : null}
		</FloatingActionBar>
	);
}
