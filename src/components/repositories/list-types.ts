export type RepositorySort = "default" | "pushed-asc" | "pushed-desc";

export const CONFIRMATION_REQUIRED_REPOSITORY_COUNT = 5;
export const DEFAULT_REPOSITORIES_PER_PAGE = 25;

export const REPOSITORIES_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export type RepositoriesPerPage =
	(typeof REPOSITORIES_PER_PAGE_OPTIONS)[number];

export const REPOSITORY_SORT_OPTIONS = [
	{
		label: "Default order",
		value: "default",
	},
	{
		label: "Last pushed: newest",
		value: "pushed-desc",
	},
	{
		label: "Last pushed: oldest",
		value: "pushed-asc",
	},
] as const satisfies ReadonlyArray<{
	label: string;
	value: RepositorySort;
}>;
