import clsx from "clsx";

export type RepositoryBadgeTone =
	| "accent"
	| "failed"
	| "info"
	| "pending"
	| "success";

const TONE_CLASS_NAMES: Record<RepositoryBadgeTone, string> = {
	accent:
		"border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
	failed:
		"border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
	info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
	pending:
		"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
	success:
		"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
};

const NEUTRAL_CLASS_NAME =
	"border-zinc-950/10 text-zinc-700 dark:border-white/10 dark:text-zinc-300";

/** Hover and open states deepen the tint rather than adding a surface behind the badge. */
const INTERACTIVE_TONE_CLASS_NAMES: Record<RepositoryBadgeTone, string> = {
	accent:
		"hover:bg-violet-100 data-open:bg-violet-100 dark:hover:bg-violet-500/25 dark:data-open:bg-violet-500/25",
	failed:
		"hover:bg-red-100 data-open:bg-red-100 dark:hover:bg-red-500/25 dark:data-open:bg-red-500/25",
	info: "hover:bg-sky-100 data-open:bg-sky-100 dark:hover:bg-sky-500/25 dark:data-open:bg-sky-500/25",
	pending:
		"hover:bg-amber-100 data-open:bg-amber-100 dark:hover:bg-amber-500/25 dark:data-open:bg-amber-500/25",
	success:
		"hover:bg-emerald-100 data-open:bg-emerald-100 dark:hover:bg-emerald-500/25 dark:data-open:bg-emerald-500/25",
};

const INTERACTIVE_NEUTRAL_CLASS_NAME =
	"hover:bg-zinc-950/5 data-open:bg-zinc-950/5 dark:hover:bg-white/10 dark:data-open:bg-white/10";

// Focus uses a ring, leaving `outline` free for the staged marker.
const INTERACTIVE_BASE_CLASS_NAME =
	"cursor-pointer justify-center focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default disabled:opacity-50";

/** Dashed outline in the badge's own colour, for a value that is staged but not yet applied. */
const STAGED_TONE_CLASS_NAMES: Record<RepositoryBadgeTone, string> = {
	accent: "outline-violet-500/70",
	failed: "outline-red-500/70",
	info: "outline-sky-500/70",
	pending: "outline-amber-500/70",
	success: "outline-emerald-500/70",
};

export const getRepositoryBadgeStagedClassName = (
	tone: RepositoryBadgeTone | undefined
): string =>
	clsx(
		"outline-dashed outline-2 outline-offset-2",
		tone ? STAGED_TONE_CLASS_NAMES[tone] : "outline-zinc-500/70"
	);

/** Classes for a badge; `interactive` adds button affordances (hover, focus, disabled). */
export const getRepositoryBadgeClassName = (
	tone: RepositoryBadgeTone | undefined,
	interactive = false
): string =>
	clsx(
		"inline-flex items-center rounded-md border px-2 py-1 font-medium text-xs",
		tone ? TONE_CLASS_NAMES[tone] : NEUTRAL_CLASS_NAME,
		interactive && INTERACTIVE_BASE_CLASS_NAME,
		interactive &&
			(tone
				? INTERACTIVE_TONE_CLASS_NAMES[tone]
				: INTERACTIVE_NEUTRAL_CLASS_NAME)
	);

export function RepositoryBadge({
	children,
	className,
	tone,
}: Readonly<{
	children: React.ReactNode;
	className?: string;
	/** Omit for the neutral badge. */
	tone?: RepositoryBadgeTone;
}>) {
	return (
		<span className={clsx(getRepositoryBadgeClassName(tone), className)}>
			{children}
		</span>
	);
}
