import clsx from "clsx";

/** A caution line under a repository's change preview; renders nothing without a warning. */
export function ChangeWarning({
	className,
	warning,
}: Readonly<{
	className?: string;
	warning: string | null;
}>) {
	if (warning === null) {
		return null;
	}

	return (
		<p
			className={clsx(
				"mt-1 text-amber-700 text-sm/6 sm:text-xs/6 dark:text-amber-400",
				className
			)}
		>
			{warning}
		</p>
	);
}
