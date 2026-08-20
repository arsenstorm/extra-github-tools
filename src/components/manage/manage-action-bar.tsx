import { Button } from "@/components/ui/button";
import { Strong, Text } from "@/components/ui/text";

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
	const repositoryLabel = repositoryCount === 1 ? "repository" : "repositories";

	return (
		<div className="fixed right-0 bottom-4 left-0 z-40 mx-auto max-w-xl rounded-3xl border border-zinc-950/10 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90">
			<div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-center sm:justify-between">
				{isManaging ? (
					<Text className="text-center sm:text-left">
						Updating <Strong>{repositoryCount}</Strong> {repositoryLabel}…
					</Text>
				) : (
					<Text className="text-center sm:text-left">
						<Strong>{repositoryCount}</Strong> {repositoryLabel} selected.
					</Text>
				)}
				<div className="flex flex-wrap justify-center gap-2">
					<Button disabled={isManaging} onClick={onEditSettings}>
						Edit settings
					</Button>
					<Button disabled={isManaging} onClick={onClearSelection} outline>
						Clear selection
					</Button>
				</div>
			</div>
		</div>
	);
}
