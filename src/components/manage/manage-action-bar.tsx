import { FloatingActionBar } from "@/components/repositories/floating-action-bar";
import { Button } from "@/components/ui/button";
import { Strong } from "@/components/ui/text";
import { pluralize } from "@/format";

export function ManageActionBar({
	isManaging,
	managingRepositoryCount,
	onClearSelection,
	onEditSettings,
	selectedRepositoryCount,
}: Readonly<{
	isManaging: boolean;
	managingRepositoryCount: number;
	onClearSelection: () => void;
	onEditSettings: () => void;
	selectedRepositoryCount: number;
}>) {
	if (!isManaging && selectedRepositoryCount === 0) {
		return null;
	}

	const repositoryCount = isManaging
		? managingRepositoryCount
		: selectedRepositoryCount;
	const repositoryLabel = pluralize(
		repositoryCount,
		"repository",
		"repositories"
	);

	return (
		<FloatingActionBar
			className="max-w-xl"
			message={
				isManaging ? (
					<>
						Updating <Strong>{repositoryCount}</Strong> {repositoryLabel}…
					</>
				) : (
					<>
						<Strong>{repositoryCount}</Strong> {repositoryLabel} selected.
					</>
				)
			}
		>
			<Button disabled={isManaging} onClick={onEditSettings}>
				Edit settings
			</Button>
			<Button disabled={isManaging} onClick={onClearSelection} outline>
				Clear selection
			</Button>
		</FloatingActionBar>
	);
}
