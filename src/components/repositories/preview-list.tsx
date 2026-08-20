import clsx from "clsx";
import { Strong } from "@/components/ui/text";

export function RepositoryPreviewList({
	children,
	className,
}: Readonly<{
	children: React.ReactNode;
	className?: string;
}>) {
	return (
		<ul
			className={clsx(
				"divide-y divide-zinc-950/10 rounded-lg border border-zinc-950/10 dark:divide-white/10 dark:border-white/10",
				className
			)}
		>
			{children}
		</ul>
	);
}

export function RepositoryPreviewItem({
	children,
	name,
}: Readonly<{
	children?: React.ReactNode;
	name: string;
}>) {
	return (
		<li className="px-3 py-2">
			<Strong>{name}</Strong>
			{children}
		</li>
	);
}
