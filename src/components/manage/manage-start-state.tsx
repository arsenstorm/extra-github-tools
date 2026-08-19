import { Text } from "@/components/ui/text";

export function ManageStartState({
	isLoading,
}: Readonly<{
	isLoading: boolean;
}>) {
	return (
		<section className="rounded-lg border border-zinc-950/15 border-dashed p-8 text-center dark:border-white/15">
			<Text>
				{isLoading
					? "Loading repositories…"
					: "Choose an account to load its repositories."}
			</Text>
		</section>
	);
}
