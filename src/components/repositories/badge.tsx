import clsx from "clsx";

export type RepositoryStatusTone = "failed" | "pending" | "success";

const STATUS_TONE_CLASS_NAMES: Record<RepositoryStatusTone, string> = {
	failed:
		"border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
	pending:
		"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
	success:
		"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export function RepositoryBadge({
	children,
	className,
	tone,
}: Readonly<{
	children: React.ReactNode;
	className?: string;
	tone?: RepositoryStatusTone;
}>) {
	return (
		<span
			className={clsx(
				"inline-flex rounded-md border px-2 py-1 font-medium text-xs",
				tone
					? STATUS_TONE_CLASS_NAMES[tone]
					: "border-zinc-950/10 text-zinc-700 dark:border-white/10 dark:text-zinc-300",
				className
			)}
		>
			{children}
		</span>
	);
}
