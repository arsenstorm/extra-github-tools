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
