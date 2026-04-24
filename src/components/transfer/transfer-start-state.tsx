import { Text } from "@/components/ui/text";

export function TransferStartState({
	from,
	to,
}: Readonly<{
	from?: string;
	to?: string;
}>) {
	return (
		<section className="rounded-lg border border-zinc-950/15 border-dashed p-8 text-center dark:border-white/15">
			<Text>
				{from || to
					? "Choose a valid source and destination to load repositories."
					: "Choose the source and destination accounts to begin."}
			</Text>
		</section>
	);
}
