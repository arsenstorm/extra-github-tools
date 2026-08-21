import type { ContributorStats } from "./types";

export const CONTRIBUTOR_SORT_KEYS = [
	"commits",
	"additions",
	"deletions",
	"activeWeeks",
] as const;

export type ContributorSortKey = (typeof CONTRIBUTOR_SORT_KEYS)[number];

export const isContributorSortKey = (
	value: unknown
): value is ContributorSortKey =>
	CONTRIBUTOR_SORT_KEYS.includes(value as ContributorSortKey);

/** GitHub apps and bots authenticate with a login that ends in `[bot]`. */
export const isBotLogin = (login: string): boolean => login.endsWith("[bot]");

export interface ContributorRow extends ContributorStats {
	/** Share of the visible contributors' commits, 0–100. */
	percentage: number;
}

export interface ContributorSummary {
	/** Bots omitted from `rows` and the totals; 0 when bots are shown. */
	hiddenBotCount: number;
	rows: ContributorRow[];
	totalAdditions: number;
	totalCommits: number;
	totalDeletions: number;
}

const PERCENT = 100;

const compareRows = (
	sortBy: ContributorSortKey,
	left: ContributorStats,
	right: ContributorStats
): number =>
	right[sortBy] - left[sortBy] ||
	right.commits - left.commits ||
	left.login.localeCompare(right.login);

/**
 * Filters, totals, and sorts contributors for display. Percentages are taken
 * against the visible rows' commits so they always sum to 100 (±rounding).
 */
export const summarizeContributors = (
	contributors: ContributorStats[],
	options: { showBots: boolean; sortBy: ContributorSortKey }
): ContributorSummary => {
	const visible = options.showBots
		? contributors
		: contributors.filter((contributor) => !contributor.isBot);
	const hiddenBotCount = contributors.length - visible.length;
	let totalAdditions = 0;
	let totalCommits = 0;
	let totalDeletions = 0;

	for (const contributor of visible) {
		totalAdditions += contributor.additions;
		totalCommits += contributor.commits;
		totalDeletions += contributor.deletions;
	}

	const rows = visible
		.map((contributor) => ({
			...contributor,
			percentage:
				totalCommits > 0 ? (contributor.commits / totalCommits) * PERCENT : 0,
		}))
		.sort((left, right) => compareRows(options.sortBy, left, right));

	return { hiddenBotCount, rows, totalAdditions, totalCommits, totalDeletions };
};
