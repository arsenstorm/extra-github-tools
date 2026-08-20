import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GitHubRepository } from "@/github/types";
import {
	DEFAULT_REPOSITORIES_PER_PAGE,
	type RepositoriesPerPage,
	type RepositorySort,
} from "./list-types";
import {
	clampRepositoryPage,
	getRepositoryPageCount,
	getRepositoryRange,
	getSelectedRepositoryNames,
	sortRepositories,
	toggleRepositoryNames,
} from "./list-utils";

export interface RepositoryListOptions {
	/** Repositories still arriving count toward the page total so it doesn't creep up. */
	expectedCount?: number;
}

export interface RepositoryListState {
	currentPage: number;
	filteredRepositories: GitHubRepository[];
	pageCount: number;
	pageEndIndex: number;
	pageStartIndex: number;
	paginatedRepositories: GitHubRepository[];
	/** Rows on the current page whose repositories haven't arrived yet. */
	placeholderRowCount: number;
	repositoriesPerPage: RepositoriesPerPage;
	repositorySearch: string;
	repositorySort: RepositorySort;
	resetList: () => void;
	selectedRepositories: string[];
	setSelectedRepositories: (repositoryNames: string[]) => void;
	toggleRepository: (
		repositoryName: string,
		shouldSelectRange?: boolean
	) => void;
	toggleVisibleRepositories: () => void;
	/** The number the footer and page count are based on. */
	totalCount: number;
	updatePage: (page: number) => void;
	updateRepositoriesPerPage: (value: RepositoriesPerPage) => void;
	updateSearch: (value: string) => void;
	updateSort: (value: RepositorySort) => void;
}

export function useRepositoryList(
	repositories: GitHubRepository[],
	options: RepositoryListOptions = {}
): RepositoryListState {
	// The shift-click anchor is only read inside handlers, so a ref keeps
	// `toggleRepository` stable (memoised rows depend on that).
	const rangeAnchorRef = useRef<string | null>(null);
	const setRangeAnchorRepository = (repositoryName: string | null): void => {
		rangeAnchorRef.current = repositoryName;
	};
	const [repositoriesPerPage, setRepositoriesPerPage] =
		useState<RepositoriesPerPage>(DEFAULT_REPOSITORIES_PER_PAGE);
	const [repositoryPage, setRepositoryPage] = useState(1);
	const [repositorySearch, setRepositorySearch] = useState("");
	const [repositorySort, setRepositorySort] =
		useState<RepositorySort>("default");
	const [selectedRepositories, setSelectedRepositoriesState] = useState<
		string[]
	>([]);

	const filteredRepositories = useMemo(() => {
		const normalizedSearch = repositorySearch.trim().toLowerCase();

		const matchingRepositories = normalizedSearch
			? repositories.filter((repository) =>
					[repository.name, repository.fullName]
						.join(" ")
						.toLowerCase()
						.includes(normalizedSearch)
				)
			: repositories;

		return sortRepositories(matchingRepositories, repositorySort);
	}, [repositories, repositorySearch, repositorySort]);

	// While the list is still arriving, the unfiltered view counts every
	// expected repository so page numbers are stable from the first page on.
	const isUnfiltered = repositorySearch.trim() === "";
	const totalCount = isUnfiltered
		? Math.max(filteredRepositories.length, options.expectedCount ?? 0)
		: filteredRepositories.length;
	const pageCount = getRepositoryPageCount(totalCount, repositoriesPerPage);
	const currentPage = clampRepositoryPage(repositoryPage, pageCount);
	const pageStartIndex =
		totalCount > 0 ? (currentPage - 1) * repositoriesPerPage : 0;
	const pageEndIndex = Math.min(
		pageStartIndex + repositoriesPerPage,
		totalCount
	);
	const paginatedRepositories = useMemo(
		() => filteredRepositories.slice(pageStartIndex, pageEndIndex),
		[filteredRepositories, pageEndIndex, pageStartIndex]
	);
	const placeholderRowCount = Math.max(
		0,
		pageEndIndex - pageStartIndex - paginatedRepositories.length
	);
	const visibleRepositoryNames = useMemo(
		() => paginatedRepositories.map((repository) => repository.name),
		[paginatedRepositories]
	);

	useEffect(() => {
		setRepositoryPage((previousPage) =>
			clampRepositoryPage(previousPage, pageCount)
		);
	}, [pageCount]);

	const updateSearch = (value: string): void => {
		setRangeAnchorRepository(null);
		setRepositoryPage(1);
		setRepositorySearch(value);
	};

	const updatePage = (page: number): void => {
		setRangeAnchorRepository(null);
		setRepositoryPage(clampRepositoryPage(page, pageCount));
	};

	const updateRepositoriesPerPage = (value: RepositoriesPerPage): void => {
		setRangeAnchorRepository(null);
		setRepositoriesPerPage(value);
		setRepositoryPage(1);
	};

	const updateSort = (value: RepositorySort): void => {
		setRangeAnchorRepository(null);
		setRepositoryPage(1);
		setRepositorySort(value);
	};

	const toggleRepository = useCallback(
		(repositoryName: string, shouldSelectRange = false): void => {
			// Read the anchor now: the updater below runs later, after this
			// click has become the new anchor.
			const rangeAnchor = rangeAnchorRef.current;

			rangeAnchorRef.current = repositoryName;
			setSelectedRepositoriesState((previousRepositories) => {
				const nextRepositories = new Set(previousRepositories);
				const rangeNames = shouldSelectRange
					? getRepositoryRange(
							visibleRepositoryNames,
							rangeAnchor,
							repositoryName
						)
					: [];

				toggleRepositoryNames(
					nextRepositories,
					rangeNames.length > 0 ? rangeNames : [repositoryName],
					repositoryName
				);

				return getSelectedRepositoryNames(nextRepositories, repositories);
			});
		},
		[repositories, visibleRepositoryNames]
	);

	const setSelectedRepositories = useCallback(
		(repositoryNames: string[]): void => {
			setSelectedRepositoriesState(
				getSelectedRepositoryNames(repositoryNames, repositories)
			);
			rangeAnchorRef.current = null;
		},
		[repositories]
	);

	/** Selects every row on the current page, or clears them when they are all selected. */
	const toggleVisibleRepositories = (): void => {
		const selectedSet = new Set(selectedRepositories);
		const areAllVisibleSelected =
			visibleRepositoryNames.length > 0 &&
			visibleRepositoryNames.every((name) => selectedSet.has(name));
		const visibleSet = new Set(visibleRepositoryNames);

		setSelectedRepositories(
			areAllVisibleSelected
				? selectedRepositories.filter((name) => !visibleSet.has(name))
				: [...selectedRepositories, ...visibleRepositoryNames]
		);
	};

	const resetList = (): void => {
		setRangeAnchorRepository(null);
		setRepositoriesPerPage(DEFAULT_REPOSITORIES_PER_PAGE);
		setRepositoryPage(1);
		setRepositorySearch("");
		setRepositorySort("default");
		setSelectedRepositoriesState([]);
	};

	return {
		currentPage,
		filteredRepositories,
		pageCount,
		pageEndIndex,
		pageStartIndex,
		paginatedRepositories,
		placeholderRowCount,
		repositoriesPerPage,
		repositorySearch,
		repositorySort,
		resetList,
		selectedRepositories,
		setSelectedRepositories,
		toggleRepository,
		toggleVisibleRepositories,
		totalCount,
		updatePage,
		updateRepositoriesPerPage,
		updateSearch,
		updateSort,
	};
}
