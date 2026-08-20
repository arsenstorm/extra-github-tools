import { Text } from "@/components/ui/text";

export function RepositoryStartState({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<section className="rounded-lg border border-zinc-950/15 border-dashed p-8 text-center dark:border-white/15">
			<Text>{children}</Text>
		</section>
	);
}
