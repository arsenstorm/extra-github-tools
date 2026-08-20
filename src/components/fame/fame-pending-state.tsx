import { ToolPage } from "@/components/tool-page";
import { Text } from "@/components/ui/text";
import { TOOLS } from "@/tools";

export function FamePendingState() {
	return (
		<ToolPage tool={TOOLS.fame}>
			<div className="flex flex-col items-center justify-center space-y-4 py-12">
				<div className="h-12 w-12 animate-spin rounded-full border-zinc-900 border-t-2 border-b-2 dark:border-zinc-100" />
				<Text className="font-medium text-lg">Analyzing repository...</Text>
				<Text className="text-sm text-zinc-500">
					This may take a moment for larger repositories.
				</Text>
			</div>
		</ToolPage>
	);
}
