import { FloatingActionBar } from "@/components/repositories/floating-action-bar";
import { Button } from "@/components/ui/button";
import { Strong } from "@/components/ui/text";
import { pluralize } from "@/format";

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
		<FloatingActionBar
			className="max-w-md"
			message={
				<>
					<Strong>{selectedRepositoryCount}</Strong>{" "}
					{pluralize(selectedRepositoryCount, "repository", "repositories")}{" "}
					selected.
				</>
			}
		>
			<Button disabled={isTransferring} onClick={onReviewTransfer}>
				{isTransferring ? "Transferring..." : "Review transfer"}
			</Button>
		</FloatingActionBar>
	);
}
