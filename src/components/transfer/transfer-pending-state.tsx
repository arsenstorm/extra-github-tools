import PageHeading from "@/components/page-heading";
import { Text } from "@/components/ui/text";

export function TransferPendingState() {
	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="Move your repositories in bulk between organizations and personal accounts."
				title="Bulk Transfer Repositories"
			/>
			<Text>Loading transfer data...</Text>
		</div>
	);
}
