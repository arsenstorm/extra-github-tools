import { Button } from "@/components/ui/button";
import { Strong, Text } from "@/components/ui/text";

export function TransferActionBar({
	isTransferring,
	onReviewTransfer,
	selectedRepositoryCount,
}: Readonly<{
	isTransferring: boolean;
	onReviewTransfer: () => void;
	selectedRepositoryCount: number;
}>) {
	if (selectedRepositoryCount === 0) {
		return null;
	}

	return (
		<div className="fixed right-0 bottom-4 left-0 z-50 mx-auto max-w-md rounded-lg border border-zinc-950/10 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Text className="text-center sm:text-left">
					<Strong>{selectedRepositoryCount}</Strong>{" "}
					{selectedRepositoryCount === 1 ? "repository" : "repositories"}{" "}
					selected.
				</Text>
				<Button disabled={isTransferring} onClick={onReviewTransfer}>
					Review transfer
				</Button>
			</div>
		</div>
	);
}
