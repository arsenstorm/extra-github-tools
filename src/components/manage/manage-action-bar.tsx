import { Button } from "@/components/ui/button";
import { Strong, Text } from "@/components/ui/text";

export function ManageActionBar({
	isManaging,
	onDiscard,
	onReviewChanges,
	pendingChangeCount,
}: Readonly<{
	isManaging: boolean;
	onDiscard: () => void;
	onReviewChanges: () => void;
	pendingChangeCount: number;
}>) {
	if (pendingChangeCount === 0) {
		return null;
	}

	const repositoryLabel =
		pendingChangeCount === 1 ? "repository" : "repositories";

	return (
		<div className="fixed right-0 bottom-4 left-0 z-40 mx-auto max-w-xl rounded-lg border border-zinc-950/10 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{isManaging ? (
					<Text className="text-center sm:text-left">
						Updating <Strong>{pendingChangeCount}</Strong> {repositoryLabel}…
					</Text>
				) : (
					<Text className="text-center sm:text-left">
						<Strong>{pendingChangeCount}</Strong> {repositoryLabel} with pending
						changes.
					</Text>
				)}
				<div className="flex flex-wrap justify-center gap-2">
					<Button disabled={isManaging} onClick={onReviewChanges}>
						Review changes
					</Button>
					<Button disabled={isManaging} onClick={onDiscard} outline>
						Discard
					</Button>
				</div>
			</div>
		</div>
	);
}
