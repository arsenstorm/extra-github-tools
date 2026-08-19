import { describe, expect, it } from "vitest";
import type { GitHubRepository } from "@/github";
import {
	clampRepositoryPage,
	formatRepositoryPushedAt,
	getRepositoryPageCount,
	getSelectedRepositoryNames,
	sortRepositories,
} from "./list-utils";

let nextRepositoryId = 1;

const createRepository = (
	name: string,
	pushedAt: string | null
): GitHubRepository => {
	nextRepositoryId += 1;

	return {
		archived: false,
		fork: false,
		fullName: `owner/${name}`,
		htmlUrl: `https://github.com/owner/${name}`,
		id: nextRepositoryId,
		name,
		private: false,
		pushedAt,
		visibility: "public",
	};
};

describe("sortRepositories", () => {
	it("returns the same array for default sort", () => {
		const repositories = [createRepository("a", "2026-01-01")];

		expect(sortRepositories(repositories, "default")).toBe(repositories);
	});

	it("sorts by pushed date descending, then name", () => {
		const a = createRepository("a", "2026-01-01");
		const b = createRepository("b", "2026-03-01");
		const c = createRepository("c", "2026-03-01");
		const d = createRepository("d", null);

		const sorted = sortRepositories([a, b, c, d], "pushed-desc");

		expect(sorted.map((repository) => repository.name)).toEqual([
			"b",
			"c",
			"a",
			"d",
		]);
	});

	it("sorts by pushed date ascending, then name", () => {
		const a = createRepository("a", "2026-01-01");
		const b = createRepository("b", "2026-03-01");
		const c = createRepository("c", "2026-03-01");
		const d = createRepository("d", null);

		const sorted = sortRepositories([a, b, c, d], "pushed-asc");

		expect(sorted.map((repository) => repository.name)).toEqual([
			"d",
			"a",
			"b",
			"c",
		]);
	});
});

describe("formatRepositoryPushedAt", () => {
	it("returns 'Never pushed' for a null date", () => {
		expect(formatRepositoryPushedAt(null)).toBe("Never pushed");
	});

	it("formats a pushed date", () => {
		expect(formatRepositoryPushedAt("2026-04-21T00:00:00Z")).toBe(
			"Apr 21, 2026"
		);
	});
});

describe("getSelectedRepositoryNames", () => {
	it("keeps only names present in the repositories list, in repository order", () => {
		const a = createRepository("a", null);
		const b = createRepository("b", null);
		const z = createRepository("z", null);

		expect(getSelectedRepositoryNames(["z", "a"], [a, b, z])).toEqual([
			"a",
			"z",
		]);
	});
});

describe("getRepositoryPageCount / clampRepositoryPage", () => {
	it("computes the page count", () => {
		expect(getRepositoryPageCount(0, 25)).toBe(1);
		expect(getRepositoryPageCount(26, 25)).toBe(2);
	});

	it("clamps the page within bounds", () => {
		expect(clampRepositoryPage(0, 3)).toBe(1);
		expect(clampRepositoryPage(9, 3)).toBe(3);
		expect(clampRepositoryPage(2, 3)).toBe(2);
	});
});
