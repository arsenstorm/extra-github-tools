import clsx from "clsx";
import { Text } from "@/components/ui/text";

/** Fixed bar pinned to the bottom of the viewport for bulk actions. */
export function FloatingActionBar({
	children,
	className,
	message,
}: Readonly<{
	children: React.ReactNode;
	className?: string;
	message: React.ReactNode;
}>) {
	return (
		<div
			className={clsx(
				"fixed right-0 bottom-4 left-0 z-40 mx-auto rounded-3xl border border-zinc-950/10 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/90",
				className
			)}
		>
			<div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-center sm:justify-between">
				<Text className="text-center sm:text-left">{message}</Text>
				<div className="flex flex-wrap justify-center gap-2">{children}</div>
			</div>
		</div>
	);
}
