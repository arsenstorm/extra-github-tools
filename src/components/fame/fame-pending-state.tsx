import PageHeading from "@/components/page-heading";
import { Text } from "@/components/ui/text";

export function FamePendingState() {
	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading
				description="See how your commits compare to your colleagues and who's doing more."
				title="Commit Fame"
			/>
			<div className="flex flex-col items-center justify-center space-y-4 py-12">
				<div className="h-12 w-12 animate-spin rounded-full border-zinc-900 border-t-2 border-b-2 dark:border-zinc-100" />
				<Text className="font-medium text-lg">Analyzing repository...</Text>
				<Text className="text-sm text-zinc-500">
					This may take a moment for larger repositories.
				</Text>
			</div>
		</div>
	);
}
