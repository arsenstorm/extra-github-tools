import clsx from "clsx";
import { type PointerEvent, useState } from "react";
import { BarList, type BarListItem } from "@/components/dither/bar-list";
import { Text } from "@/components/ui/text";
import { formatCompactNumber, formatCount } from "@/format";
import {
	CONTRIBUTOR_SORT_KEYS,
	type ContributorRow,
	type ContributorSortKey,
	summarizeContributors,
} from "@/github/contributor-summary";
import type { ContributorStats } from "@/github/types";

const PANEL_TITLES: Record<ContributorSortKey, string> = {
	activeWeeks: "Active weeks",
	additions: "Lines added",
	commits: "Commits",
	deletions: "Lines deleted",
};
const ROWS_PER_PANEL = 8;
// The signed-in user's bars use a second hue so they can find themselves at a glance.
const VIEWER_COLOR = "green";

const ROW_CLASS_NAME =
	"grid min-h-11 w-full @sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_4.5rem] grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_4rem] items-center gap-3 rounded text-left focus-visible:outline-2 focus-visible:outline-blue-500 sm:min-h-10";

function BotPill() {
	return (
		<span className="shrink-0 rounded-full border border-zinc-950/10 px-1.5 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-300">
			bot
		</span>
	);
}

const toBarListItem = (
	row: ContributorRow,
	metric: ContributorSortKey,
	viewerLogin: string | undefined
): BarListItem => ({
	color: row.login === viewerLogin ? VIEWER_COLOR : undefined,
	key: row.login,
	label: (
		<span
			className="flex min-w-0 items-center gap-1.5"
			title={`${row.name} (@${row.login})`}
		>
			<span className="truncate">{row.name}</span>
			{row.isBot ? <BotPill /> : null}
		</span>
	),
	value: row[metric],
	valueLabel: formatCompactNumber(row[metric]),
});

const describeFooter = (
	hiddenRank: number,
	remainingCount: number
): string | null => {
	if (hiddenRank >= 0) {
		return `Highlighted contributor ranks #${hiddenRank + 1} here.`;
	}

	return remainingCount > 0
		? `${formatCount(remainingCount, "more contributor", "more contributors")} not shown`
		: null;
};

function FacetPanel({
	contributors,
	highlightedLogin,
	metric,
	onHighlight,
	showBots,
	viewerLogin,
}: Readonly<{
	contributors: ContributorStats[];
	highlightedLogin: string | null;
	metric: ContributorSortKey;
	onHighlight: (login: string | null) => void;
	showBots: boolean;
	viewerLogin?: string;
}>) {
	const { rows } = summarizeContributors(contributors, {
		showBots,
		sortBy: metric,
	});
	const shown = rows.slice(0, ROWS_PER_PANEL);
	const highlightedIndex = highlightedLogin
		? rows.findIndex((row) => row.login === highlightedLogin)
		: -1;
	const footer = describeFooter(
		highlightedIndex >= ROWS_PER_PANEL ? highlightedIndex : -1,
		rows.length - shown.length
	);

	return (
		<section className="@container rounded-lg border border-zinc-950/10 p-5 dark:border-white/10">
			<h3 className="font-medium text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white">
				{PANEL_TITLES[metric]}
			</h3>
			<BarList
				activeKey={highlightedLogin}
				className="mt-3"
				items={shown.map((row) => toBarListItem(row, metric, viewerLogin))}
				renderRow={(item, cells) => {
					const isHighlighted = highlightedLogin === item.key;
					// Hover follows the mouse only; on touch a tap toggles instead, so nothing sticks.
					const handlePointerEnter = (event: PointerEvent): void => {
						if (event.pointerType === "mouse") {
							onHighlight(item.key);
						}
					};

					return (
						<button
							aria-pressed={isHighlighted}
							className={clsx(
								ROW_CLASS_NAME,
								highlightedLogin !== null && !isHighlighted && "opacity-60"
							)}
							onBlur={() => onHighlight(null)}
							onClick={() => onHighlight(isHighlighted ? null : item.key)}
							onFocus={() => onHighlight(item.key)}
							onPointerEnter={handlePointerEnter}
							onPointerLeave={() => onHighlight(null)}
							type="button"
						>
							{cells}
						</button>
					);
				}}
			/>
			{/* Reserve the line so panels stay the same height with or without a footer. */}
			<Text className="mt-3 min-h-5 text-sm sm:text-xs">{footer}</Text>
		</section>
	);
}

/**
 * Four small multiples ranking the same contributors by one measure each, so
 * no single ordering is presented as "the" ranking. Highlighting a person in
 * one panel highlights them in all four.
 */
export function ContributorFacets({
	contributors,
	showBots,
	viewerLogin,
}: Readonly<{
	contributors: ContributorStats[];
	showBots: boolean;
	/** Login of the signed-in user, whose bars get their own colour. */
	viewerLogin?: string;
}>) {
	const [highlightedLogin, setHighlightedLogin] = useState<string | null>(null);

	return (
		<div className="grid gap-4 md:grid-cols-2">
			{CONTRIBUTOR_SORT_KEYS.map((metric) => (
				<FacetPanel
					contributors={contributors}
					highlightedLogin={highlightedLogin}
					key={metric}
					metric={metric}
					onHighlight={setHighlightedLogin}
					showBots={showBots}
					viewerLogin={viewerLogin}
				/>
			))}
		</div>
	);
}
