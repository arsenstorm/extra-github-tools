export const pluralize = (
	count: number,
	singular: string,
	plural: string
): string => (count === 1 ? singular : plural);

export const formatCount = (
	count: number,
	singular: string,
	plural: string
): string => `${count} ${pluralize(count, singular, plural)}`;

export const formatRepositoryCount = (count: number): string =>
	formatCount(count, "repository", "repositories");

const COMPACT_THRESHOLD = 10_000;
const compactFormatter = new Intl.NumberFormat("en", {
	maximumFractionDigits: 1,
	notation: "compact",
});

/** 9,876 stays exact; 12,345 becomes 12.3K so columns of large numbers stay narrow. */
export const formatCompactNumber = (value: number): string =>
	Math.abs(value) >= COMPACT_THRESHOLD
		? compactFormatter.format(value)
		: value.toLocaleString();
