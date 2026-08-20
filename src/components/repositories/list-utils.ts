import type { GitHubRepository } from "@/github/types";
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

interface RepositoryOutcome {
	ok: boolean;
	repository: string;
}

export const getFailedRepositoryNames = (
	results: RepositoryOutcome[] | null
): string[] =>
	(results ?? [])
		.filter((result) => !result.ok)
		.map((result) => result.repository);

export const getSucceededRepositoryNames = (
	results: RepositoryOutcome[]
): string[] =>
	results.filter((result) => result.ok).map((result) => result.repository);

/** The visible names between the anchor and the target, inclusive; empty when either is off the page. */
export const getRepositoryRange = (
	visibleNames: string[],
	anchorName: string | null,
	targetName: string
): string[] => {
	// An absent anchor can't match a name, so indexOf yields -1.
	const anchorIndex = visibleNames.indexOf(anchorName ?? "");
	const targetIndex = visibleNames.indexOf(targetName);

	if (anchorIndex < 0 || targetIndex < 0) {
		return [];
	}

	return visibleNames.slice(
		Math.min(anchorIndex, targetIndex),
		Math.max(anchorIndex, targetIndex) + 1
	);
};

/** Adds or removes every name, matching the target's new state. */
export const toggleRepositoryNames = (
	selection: Set<string>,
	names: string[],
	targetName: string
): void => {
	const shouldSelect = !selection.has(targetName);

	for (const name of names) {
		if (shouldSelect) {
			selection.add(name);
		} else {
			selection.delete(name);
		}
	}
};
