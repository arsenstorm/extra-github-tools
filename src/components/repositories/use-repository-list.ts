import { useEffect, useMemo, useState } from "react";
import type { GitHubRepository } from "@/github";
import {
	DEFAULT_REPOSITORIES_PER_PAGE,
	type RepositoriesPerPage,
	type RepositorySort,
} from "./list-types";
import {
	clampRepositoryPage,
	getRepositoryPageCount,
	getSelectedRepositoryNames,
	sortRepositories,
} from "./list-utils";

export interface RepositoryListState {
	currentPage: number;
	filteredRepositories: GitHubRepository[];
	pageCount: number;
	pageEndIndex: number;
	pageStartIndex: number;
	paginatedRepositories: GitHubRepository[];
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
	updatePage: (page: number) => void;
	updateRepositoriesPerPage: (value: RepositoriesPerPage) => void;
	updateSearch: (value: string) => void;
	updateSort: (value: RepositorySort) => void;
}

export function useRepositoryList(
	repositories: GitHubRepository[]
): RepositoryListState {
	const [rangeAnchorRepository, setRangeAnchorRepository] = useState<
		string | null
	>(null);
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

	const pageCount = getRepositoryPageCount(
		filteredRepositories.length,
		repositoriesPerPage
	);
	const currentPage = clampRepositoryPage(repositoryPage, pageCount);
	const pageStartIndex =
		filteredRepositories.length > 0
			? (currentPage - 1) * repositoriesPerPage
			: 0;
	const pageEndIndex = Math.min(
		pageStartIndex + repositoriesPerPage,
		filteredRepositories.length
	);
	const paginatedRepositories = useMemo(
		() => filteredRepositories.slice(pageStartIndex, pageEndIndex),
		[filteredRepositories, pageEndIndex, pageStartIndex]
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

	const toggleRepository = (
		repositoryName: string,
		shouldSelectRange = false
	): void => {
		setSelectedRepositoriesState((previousRepositories) => {
			const nextRepositories = new Set(previousRepositories);
			const anchorIndex = rangeAnchorRepository
				? visibleRepositoryNames.indexOf(rangeAnchorRepository)
				: -1;
			const repositoryIndex = visibleRepositoryNames.indexOf(repositoryName);

			if (shouldSelectRange && anchorIndex >= 0 && repositoryIndex >= 0) {
				const rangeStart = Math.min(anchorIndex, repositoryIndex);
				const rangeEnd = Math.max(anchorIndex, repositoryIndex);
				const shouldSelectRepositories = !nextRepositories.has(repositoryName);

				for (const visibleRepositoryName of visibleRepositoryNames.slice(
					rangeStart,
					rangeEnd + 1
				)) {
					if (shouldSelectRepositories) {
						nextRepositories.add(visibleRepositoryName);
					} else {
						nextRepositories.delete(visibleRepositoryName);
					}
				}

				return getSelectedRepositoryNames(nextRepositories, repositories);
			}

			if (nextRepositories.has(repositoryName)) {
				nextRepositories.delete(repositoryName);
			} else {
				nextRepositories.add(repositoryName);
			}

			return getSelectedRepositoryNames(nextRepositories, repositories);
		});
		setRangeAnchorRepository(repositoryName);
	};

	const setSelectedRepositories = (repositoryNames: string[]): void => {
		setSelectedRepositoriesState(
			getSelectedRepositoryNames(repositoryNames, repositories)
		);
		setRangeAnchorRepository(null);
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
		repositoriesPerPage,
		repositorySearch,
		repositorySort,
		resetList,
		selectedRepositories,
		setSelectedRepositories,
		toggleRepository,
		updatePage,
		updateRepositoriesPerPage,
		updateSearch,
		updateSort,
	};
}
