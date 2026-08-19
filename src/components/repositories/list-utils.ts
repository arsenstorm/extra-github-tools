import type { GitHubRepository } from "@/github";
import type { RepositorySort } from "./list-types";

export const formatRepositoryPushedAt = (pushedAt: string | null): string => {
	if (!pushedAt) {
		return "Never pushed";
	}

	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
		year: "numeric",
	}).format(new Date(pushedAt));
};

const getRepositoryPushedAtTimestamp = (pushedAt: string | null): number => {
	if (!pushedAt) {
		return 0;
	}

	const timestamp = Date.parse(pushedAt);

	return Number.isNaN(timestamp) ? 0 : timestamp;
};

const compareRepositoryNames = (
	firstRepository: GitHubRepository,
	secondRepository: GitHubRepository
): number => firstRepository.name.localeCompare(secondRepository.name);

export const sortRepositories = (
	repositories: GitHubRepository[],
	repositorySort: RepositorySort
): GitHubRepository[] => {
	if (repositorySort === "default") {
		return repositories;
	}

	const direction = repositorySort === "pushed-desc" ? -1 : 1;

	return [...repositories].sort((firstRepository, secondRepository) => {
		const pushedAtDifference =
			(getRepositoryPushedAtTimestamp(firstRepository.pushedAt) -
				getRepositoryPushedAtTimestamp(secondRepository.pushedAt)) *
			direction;

		return (
			pushedAtDifference ||
			compareRepositoryNames(firstRepository, secondRepository)
		);
	});
};

export const getSelectedRepositoryNames = (
	repositoryNames: Iterable<string>,
	repositories: GitHubRepository[]
): string[] => {
	const selectedRepositoryNames = new Set(repositoryNames);

	return repositories
		.filter((repository) => selectedRepositoryNames.has(repository.name))
		.map((repository) => repository.name);
};

export const getRepositoryPageCount = (
	repositoryCount: number,
	repositoriesPerPage: number
): number => Math.max(1, Math.ceil(repositoryCount / repositoriesPerPage));

export const clampRepositoryPage = (page: number, pageCount: number): number =>
	Math.min(Math.max(page, 1), pageCount);
