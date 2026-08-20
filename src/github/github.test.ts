import { describe, expect, it } from "vitest";
import {
	getGitHubOrganizationSupportsInternal,
	listGitHubAccounts,
	listGitHubRepositories,
	listGitHubRepositoriesPage,
} from "./accounts";
import { analyzeGitHubRepository } from "./analysis";
import { manageGitHubRepositories } from "./manage";
import { transferGitHubRepositories } from "./transfer";
import { isGitHubContributorStatsPendingError } from "./types";

const MANAGED_REPOSITORY_PATH_PATTERN = /\/repos\/owner\/([^/]+)$/;

const getFetchUrl = (input: Parameters<typeof fetch>[0]): string => {
	if (typeof input === "string") {
		return input;
	}

	if (input instanceof URL) {
		return input.toString();
	}

	return input.url;
};

const createFetchImplementation =
	(
		handler: (url: string, init: RequestInit) => Promise<Response> | Response
	): typeof fetch =>
	async (input, init) =>
		await handler(getFetchUrl(input), init ?? {});

const createRepositoryResponse = (name: string, owner = "source") => ({
	archived: false,
	fork: false,
	full_name: `${owner}/${name}`,
	html_url: `https://github.com/${owner}/${name}`,
	id: Number(name.replace(/\D/g, "")) || 1,
	name,
	private: false,
	pushed_at: "2026-04-21T00:00:00Z",
	visibility: "public",
});

const createManagedRepositoryResponse = (
	archived: boolean,
	visibility: string
) => ({ archived, visibility });

const createSubscriptionResponse = (subscribed: boolean, ignored: boolean) => ({
	ignored,
	subscribed,
});

const createRepositoryInfoResponse = () => ({
	default_branch: "main",
});

const createTreeResponse = () => ({
	tree: [{ type: "blob" }, { type: "tree" }, { type: "blob" }],
});

const createContributorStatsResponse = () => [
	{
		author: {
			login: "alice",
		},
		total: 3,
		weeks: [
			{
				a: 10,
				c: 2,
				d: 4,
			},
			{
				a: 1,
				c: 0,
				d: 0,
			},
		],
	},
];

const createUserProfileResponse = () => ({
	email: null,
	login: "alice",
	name: "Alice",
});

describe("listGitHubAccounts", () => {
	it("reuses a known viewer instead of requesting /user", async () => {
		const requestedUrls: string[] = [];
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);

			return new Response(
				JSON.stringify([{ avatar_url: "https://a/org", id: 2, login: "acme" }]),
				{ status: 200, statusText: "OK" }
			);
		});

		const accounts = await listGitHubAccounts("token", fetchImplementation, {
			viewer: { avatarUrl: "https://a/me", id: 1, login: "octocat" },
		});

		expect(requestedUrls).toEqual(["https://api.github.com/user/orgs"]);
		expect(accounts).toEqual([
			{ avatar: "https://a/me", handle: "octocat", id: 1 },
			{ avatar: "https://a/org", handle: "acme", id: 2 },
		]);
	});
});

describe("listGitHubRepositories", () => {
	it("skips the organization lookup when the account is the viewer", async () => {
		const requestedUrls: string[] = [];
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);

			return new Response(
				JSON.stringify([
					createRepositoryResponse("mine", "Octocat"),
					createRepositoryResponse("theirs", "someone-else"),
				]),
				{ status: 200, statusText: "OK" }
			);
		});

		const repositories = await listGitHubRepositories(
			"token",
			"octocat",
			fetchImplementation,
			{ viewerLogin: "Octocat" }
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/user/repos?affiliation=owner&page=1&per_page=100",
		]);
		expect(repositories.map((repository) => repository.name)).toEqual(["mine"]);
	});

	it("loads every repository page for organization accounts", async () => {
		const requestedUrls: string[] = [];
		const firstPageRepositories = Array.from({ length: 100 }, (_item, index) =>
			createRepositoryResponse(`repo-${index}`)
		);
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);
			const page = new URL(url).searchParams.get("page");

			return new Response(
				JSON.stringify(
					page === "1"
						? firstPageRepositories
						: [createRepositoryResponse("repo-100")]
				),
				{
					status: 200,
					statusText: "OK",
				}
			);
		});

		const repositories = await listGitHubRepositories(
			"token",
			"source",
			fetchImplementation
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/orgs/source/repos?page=1&per_page=100",
			"https://api.github.com/orgs/source/repos?page=2&per_page=100",
		]);
		expect(repositories).toHaveLength(101);
		expect(repositories.at(-1)).toMatchObject({
			fullName: "source/repo-100",
			name: "repo-100",
		});
	});

	it("loads authenticated owner repositories for personal accounts", async () => {
		const requestedUrls: string[] = [];
		const firstPageRepositories = Array.from({ length: 100 }, (_item, index) =>
			createRepositoryResponse(`repo-${index}`)
		);
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);

			if (url.includes("/orgs/source/repos")) {
				return new Response("not found", {
					status: 404,
					statusText: "Not Found",
				});
			}

			const page = new URL(url).searchParams.get("page");

			return new Response(
				JSON.stringify(
					page === "1"
						? firstPageRepositories
						: [
								{
									...createRepositoryResponse("private-repo"),
									private: true,
								},
								createRepositoryResponse("other-owned", "other"),
							]
				),
				{
					status: 200,
					statusText: "OK",
				}
			);
		});

		const repositories = await listGitHubRepositories(
			"token",
			"source",
			fetchImplementation
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/orgs/source/repos?page=1&per_page=100",
			"https://api.github.com/user/repos?affiliation=owner&page=1&per_page=100",
			"https://api.github.com/user/repos?affiliation=owner&page=2&per_page=100",
		]);
		expect(repositories).toHaveLength(101);
		expect(repositories.at(-1)).toMatchObject({
			fullName: "source/private-repo",
			name: "private-repo",
			private: true,
		});
	});

	it("fetches remaining pages in parallel when a Link header names the last page", async () => {
		const requestedUrls: string[] = [];
		const firstPageRepositories = Array.from({ length: 100 }, (_item, index) =>
			createRepositoryResponse(`repo-${index}`)
		);
		const secondPageRepositories = Array.from({ length: 100 }, (_item, index) =>
			createRepositoryResponse(`page2-repo-${index}`)
		);
		const thirdPageRepositories = [createRepositoryResponse("page3-repo-0")];
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);
			const page = new URL(url).searchParams.get("page");

			if (page === "1") {
				return new Response(JSON.stringify(firstPageRepositories), {
					headers: {
						Link: '<https://api.github.com/orgs/source/repos?page=2&per_page=100>; rel="next", <https://api.github.com/orgs/source/repos?page=3&per_page=100>; rel="last"',
					},
					status: 200,
					statusText: "OK",
				});
			}

			if (page === "2") {
				return new Response(JSON.stringify(secondPageRepositories), {
					status: 200,
					statusText: "OK",
				});
			}

			return new Response(JSON.stringify(thirdPageRepositories), {
				status: 200,
				statusText: "OK",
			});
		});

		const repositories = await listGitHubRepositories(
			"token",
			"source",
			fetchImplementation
		);

		expect(new Set(requestedUrls)).toEqual(
			new Set([
				"https://api.github.com/orgs/source/repos?page=1&per_page=100",
				"https://api.github.com/orgs/source/repos?page=2&per_page=100",
				"https://api.github.com/orgs/source/repos?page=3&per_page=100",
			])
		);
		expect(repositories).toHaveLength(201);
		expect(repositories[0]).toMatchObject({ name: "repo-0" });
		expect(repositories[100]).toMatchObject({ name: "page2-repo-0" });
		expect(repositories.at(-1)).toMatchObject({ name: "page3-repo-0" });
	});

	it("trusts the Link header's last page and does not request beyond it", async () => {
		const requestedUrls: string[] = [];
		const firstPageRepositories = Array.from({ length: 100 }, (_item, index) =>
			createRepositoryResponse(`repo-${index}`)
		);
		const secondPageRepositories = Array.from({ length: 100 }, (_item, index) =>
			createRepositoryResponse(`page2-repo-${index}`)
		);
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);
			const page = new URL(url).searchParams.get("page");

			if (page === "1") {
				return new Response(JSON.stringify(firstPageRepositories), {
					headers: {
						Link: '<https://api.github.com/orgs/source/repos?page=2&per_page=100>; rel="last"',
					},
					status: 200,
					statusText: "OK",
				});
			}

			return new Response(JSON.stringify(secondPageRepositories), {
				status: 200,
				statusText: "OK",
			});
		});

		const repositories = await listGitHubRepositories(
			"token",
			"source",
			fetchImplementation
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/orgs/source/repos?page=1&per_page=100",
			"https://api.github.com/orgs/source/repos?page=2&per_page=100",
		]);
		expect(repositories).toHaveLength(200);
	});

	it("falls back to sequential fetching when the Link header has no rel=last match", async () => {
		const requestedUrls: string[] = [];
		const firstPageRepositories = Array.from({ length: 100 }, (_item, index) =>
			createRepositoryResponse(`repo-${index}`)
		);
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);
			const page = new URL(url).searchParams.get("page");

			if (page === "1") {
				return new Response(JSON.stringify(firstPageRepositories), {
					headers: {
						Link: '<https://api.github.com/orgs/source/repos?page=2&per_page=100>; rel="next"',
					},
					status: 200,
					statusText: "OK",
				});
			}

			return new Response(
				JSON.stringify([createRepositoryResponse("repo-100")]),
				{
					status: 200,
					statusText: "OK",
				}
			);
		});

		const repositories = await listGitHubRepositories(
			"token",
			"source",
			fetchImplementation
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/orgs/source/repos?page=1&per_page=100",
			"https://api.github.com/orgs/source/repos?page=2&per_page=100",
		]);
		expect(repositories).toHaveLength(101);
		expect(repositories.at(-1)).toMatchObject({ name: "repo-100" });
	});
});

describe("analyzeGitHubRepository", () => {
	it("keeps polling while GitHub is calculating contributor statistics", async () => {
		const sleepDurations: number[] = [];
		let contributorStatsAttempts = 0;
		const fetchImplementation = createFetchImplementation((url) => {
			if (url.endsWith("/repos/source/repo")) {
				return new Response(JSON.stringify(createRepositoryInfoResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.endsWith("/git/trees/main?recursive=1")) {
				return new Response(JSON.stringify(createTreeResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.endsWith("/stats/contributors")) {
				contributorStatsAttempts += 1;

				if (contributorStatsAttempts === 1) {
					return new Response("", {
						headers: {
							"Retry-After": "2",
						},
						status: 202,
						statusText: "Accepted",
					});
				}

				return new Response(JSON.stringify(createContributorStatsResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.endsWith("/users/alice")) {
				return new Response(JSON.stringify(createUserProfileResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			return new Response("not found", {
				status: 404,
				statusText: "Not Found",
			});
		});

		const stats = await analyzeGitHubRepository("token", "source", "repo", {
			contributorStatsDelayMs: 123,
			fetchImplementation,
			maxContributorStatsAttempts: 2,
			sleep: (durationMs) => {
				sleepDurations.push(durationMs);
				return Promise.resolve();
			},
		});

		expect(sleepDurations).toEqual([2000]);
		expect(stats).toMatchObject({
			contributors: [
				{
					activeWeeks: 1,
					additions: 11,
					commits: 3,
					deletions: 4,
					email: "alice@users.noreply.github.com",
					name: "Alice",
					percentage: 100,
				},
			],
			totalAdditions: 11,
			totalCommits: 3,
			totalDeletions: 4,
			totalFiles: 2,
			totalLines: 7,
		});
	});

	it("surfaces a pending error after GitHub keeps returning 202", async () => {
		const sleepDurations: number[] = [];
		const fetchImplementation = createFetchImplementation((url) => {
			if (url.endsWith("/repos/source/repo")) {
				return new Response(JSON.stringify(createRepositoryInfoResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.endsWith("/git/trees/main?recursive=1")) {
				return new Response(JSON.stringify(createTreeResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.endsWith("/stats/contributors")) {
				return new Response("", {
					status: 202,
					statusText: "Accepted",
				});
			}

			return new Response("not found", {
				status: 404,
				statusText: "Not Found",
			});
		});
		let caughtError: unknown;

		try {
			await analyzeGitHubRepository("token", "source", "repo", {
				contributorStatsDelayMs: 123,
				fetchImplementation,
				maxContributorStatsAttempts: 2,
				sleep: (durationMs) => {
					sleepDurations.push(durationMs);
					return Promise.resolve();
				},
			});
		} catch (error) {
			caughtError = error;
		}

		expect(isGitHubContributorStatsPendingError(caughtError)).toBe(true);
		expect(caughtError).toBeInstanceOf(Error);
		expect((caughtError as Error).message).toContain(
			"GitHub is still calculating contributor statistics"
		);
		expect(sleepDurations).toEqual([123]);
	});

	it("does not fetch repository details while contributor statistics are pending", async () => {
		const requestedUrls: string[] = [];
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);

			if (url.endsWith("/stats/contributors")) {
				return new Response("", {
					status: 202,
					statusText: "Accepted",
				});
			}

			return new Response("unexpected request", {
				status: 500,
				statusText: "Unexpected Request",
			});
		});
		let caughtError: unknown;

		try {
			await analyzeGitHubRepository("token", "source", "repo", {
				fetchImplementation,
				maxContributorStatsAttempts: 1,
				sleep: () => Promise.resolve(),
			});
		} catch (error) {
			caughtError = error;
		}

		expect(isGitHubContributorStatsPendingError(caughtError)).toBe(true);
		expect(requestedUrls).toEqual([
			"https://api.github.com/repos/source/repo/stats/contributors",
		]);
	});

	it("limits concurrent contributor profile requests", async () => {
		const contributors = Array.from({ length: 12 }, (_item, index) => ({
			author: {
				login: `user-${index}`,
			},
			total: 1,
			weeks: [
				{
					a: 1,
					c: 1,
					d: 0,
				},
			],
		}));
		let inFlight = 0;
		let maxInFlight = 0;
		const fetchImplementation = createFetchImplementation(async (url) => {
			if (url.endsWith("/repos/source/repo")) {
				return new Response(JSON.stringify(createRepositoryInfoResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.endsWith("/git/trees/main?recursive=1")) {
				return new Response(JSON.stringify(createTreeResponse()), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.endsWith("/stats/contributors")) {
				return new Response(JSON.stringify(contributors), {
					status: 200,
					statusText: "OK",
				});
			}

			if (url.includes("/users/")) {
				const [, login] = url.split("/users/");

				inFlight += 1;
				maxInFlight = Math.max(maxInFlight, inFlight);

				await new Promise((resolve) => {
					setTimeout(resolve, 1);
				});

				inFlight -= 1;

				return new Response(
					JSON.stringify({ email: null, login, name: null }),
					{
						status: 200,
						statusText: "OK",
					}
				);
			}

			return new Response("not found", {
				status: 404,
				statusText: "Not Found",
			});
		});

		const stats = await analyzeGitHubRepository("token", "source", "repo", {
			fetchImplementation,
		});

		expect(maxInFlight).toBeLessThanOrEqual(5);
		expect(stats.contributors).toHaveLength(12);
	});
});

describe("transferGitHubRepositories", () => {
	it("returns per-repository results when one transfer fails", async () => {
		const requestedUrls: string[] = [];
		const fetchImplementation = createFetchImplementation((url, init) => {
			requestedUrls.push(url);
			expect(init.method).toBe("POST");
			expect(JSON.parse(String(init.body))).toEqual({
				new_owner: "target",
			});

			if (url.endsWith("/broken/transfer")) {
				return new Response("repository transfer blocked", {
					status: 422,
					statusText: "Unprocessable Entity",
				});
			}

			return new Response("", {
				status: 202,
				statusText: "Accepted",
			});
		});

		const results = await transferGitHubRepositories(
			"token",
			"source",
			"target",
			["first", "broken", "last"],
			fetchImplementation
		);

		expect(requestedUrls).toHaveLength(3);
		expect(results).toEqual([
			{
				error: null,
				newName: "first",
				ok: true,
				repository: "first",
				status: 202,
				statusText: "Accepted",
			},
			{
				error: "Failed to transfer broken. repository transfer blocked",
				newName: "broken",
				ok: false,
				repository: "broken",
				status: 422,
				statusText: "Unprocessable Entity",
			},
			{
				error: null,
				newName: "last",
				ok: true,
				repository: "last",
				status: 202,
				statusText: "Accepted",
			},
		]);
	});

	it("adds a transfer name when prefix or suffix options are set", async () => {
		const requestBodies: unknown[] = [];
		const fetchImplementation = createFetchImplementation((_url, init) => {
			requestBodies.push(JSON.parse(String(init.body)));

			return new Response("", {
				status: 202,
				statusText: "Accepted",
			});
		});

		const results = await transferGitHubRepositories(
			"token",
			"source",
			"target",
			["repo"],
			fetchImplementation,
			{
				namePrefix: "archived-",
				nameSuffix: "-migrated",
			}
		);

		expect(requestBodies).toEqual([
			{
				new_name: "archived-repo-migrated",
				new_owner: "target",
			},
		]);
		expect(results[0]?.newName).toBe("archived-repo-migrated");
	});

	it("updates repository settings after a successful transfer when requested", async () => {
		const requestBodies: unknown[] = [];
		const requestedUrls: string[] = [];
		const fetchImplementation = createFetchImplementation((url, init) => {
			requestedUrls.push(url);
			requestBodies.push(JSON.parse(String(init.body)));

			if (init.method === "PATCH") {
				return new Response("", {
					status: 200,
					statusText: "OK",
				});
			}

			return new Response("", {
				status: 202,
				statusText: "Accepted",
			});
		});

		const results = await transferGitHubRepositories(
			"token",
			"source",
			"target",
			["repo"],
			fetchImplementation,
			{
				archiveState: "archived",
				visibility: "private",
			}
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/repos/source/repo/transfer",
			"https://api.github.com/repos/target/repo",
		]);
		expect(requestBodies).toEqual([
			{
				new_owner: "target",
			},
			{
				archived: true,
				private: true,
			},
		]);
		expect(results[0]?.postTransferSettings).toEqual({
			error: null,
			ok: true,
			status: 200,
			statusText: "OK",
		});
	});

	it("retries settings updates while GitHub is finishing the transfer", async () => {
		const sleepDurations: number[] = [];
		const requestedUrls: string[] = [];
		let settingsAttempts = 0;
		const fetchImplementation = createFetchImplementation((url, init) => {
			requestedUrls.push(url);

			if (init.method === "PATCH") {
				settingsAttempts += 1;

				if (settingsAttempts === 1) {
					return new Response(
						JSON.stringify({
							message:
								"Failed to update visibility. A previous repository operation is still in progress.",
							status: "422",
						}),
						{
							status: 422,
							statusText: "Unprocessable Entity",
						}
					);
				}

				return new Response("", {
					status: 200,
					statusText: "OK",
				});
			}

			return new Response("", {
				status: 202,
				statusText: "Accepted",
			});
		});

		const results = await transferGitHubRepositories(
			"token",
			"source",
			"target",
			["repo"],
			fetchImplementation,
			{
				maxSettingsUpdateAttempts: 2,
				settingsUpdateDelayMs: 123,
				sleep: (durationMs) => {
					sleepDurations.push(durationMs);
					return Promise.resolve();
				},
				visibility: "private",
			}
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/repos/source/repo/transfer",
			"https://api.github.com/repos/target/repo",
			"https://api.github.com/repos/target/repo",
		]);
		expect(sleepDurations).toEqual([123]);
		expect(results[0]).toMatchObject({
			error: null,
			ok: true,
			postTransferSettings: {
				error: null,
				ok: true,
				status: 200,
				statusText: "OK",
			},
		});
	});

	it("keeps transfer results successful when a settings update fails", async () => {
		const fetchImplementation = createFetchImplementation((_url, init) => {
			if (init.method === "PATCH") {
				return new Response("no permission", {
					status: 403,
					statusText: "Forbidden",
				});
			}

			return new Response("", {
				status: 202,
				statusText: "Accepted",
			});
		});

		const results = await transferGitHubRepositories(
			"token",
			"source",
			"target",
			["repo"],
			fetchImplementation,
			{
				archiveState: "unarchived",
				visibility: "public",
			}
		);

		expect(results[0]).toMatchObject({
			error: null,
			newName: "repo",
			ok: true,
			postTransferSettings: {
				error:
					"Transferred repo, but failed to update repository settings. no permission",
				ok: false,
				status: 403,
				statusText: "Forbidden",
			},
			repository: "repo",
			status: 202,
			statusText: "Accepted",
		});
	});

	it("limits concurrent transfer requests", async () => {
		let inFlightRequests = 0;
		let maxInFlightRequests = 0;
		const fetchImplementation = createFetchImplementation(async () => {
			inFlightRequests += 1;
			maxInFlightRequests = Math.max(maxInFlightRequests, inFlightRequests);

			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});

			inFlightRequests -= 1;

			return new Response("", {
				status: 202,
				statusText: "Accepted",
			});
		});

		await transferGitHubRepositories(
			"token",
			"source",
			"target",
			["one", "two", "three", "four", "five"],
			fetchImplementation
		);

		expect(maxInFlightRequests).toBeLessThanOrEqual(3);
	});
});

describe("manageGitHubRepositories", () => {
	const noChangeActions = {
		archiveAction: "current",
		subscriptionAction: "current",
		visibilityAction: "current",
	} as const;

	it("archives a repository and leaves other settings untouched", async () => {
		const requestedMethods: string[] = [];
		const fetchImplementation = createFetchImplementation((_url, init) => {
			const method = init.method ?? "GET";

			requestedMethods.push(method);

			if (method === "GET") {
				return new Response(
					JSON.stringify(createManagedRepositoryResponse(false, "private")),
					{ status: 200, statusText: "OK" }
				);
			}

			expect(JSON.parse(String(init.body))).toEqual({ archived: true });

			return new Response("", { status: 200, statusText: "OK" });
		});

		const results = await manageGitHubRepositories(
			"token",
			"owner",
			[
				{
					actions: { ...noChangeActions, archiveAction: "archived" },
					repository: "repo",
				},
			],
			fetchImplementation
		);

		expect(requestedMethods).toEqual(["GET", "PATCH"]);
		expect(results).toEqual([
			{
				archive: {
					error: null,
					outcome: "changed",
					status: 200,
					statusText: "OK",
				},
				ok: true,
				repository: "repo",
				subscription: null,
				visibility: null,
			},
		]);
	});

	it("unarchives a repository", async () => {
		const requestBodies: unknown[] = [];
		const fetchImplementation = createFetchImplementation((_url, init) => {
			const method = init.method ?? "GET";

			if (method === "GET") {
				return new Response(
					JSON.stringify(createManagedRepositoryResponse(true, "private")),
					{ status: 200, statusText: "OK" }
				);
			}

			requestBodies.push(JSON.parse(String(init.body)));

			return new Response("", { status: 200, statusText: "OK" });
		});

		const results = await manageGitHubRepositories(
			"token",
			"owner",
			[
				{
					actions: { ...noChangeActions, archiveAction: "unarchived" },
					repository: "repo",
				},
			],
			fetchImplementation
		);

		expect(requestBodies).toEqual([{ archived: false }]);
		expect(results[0]?.archive?.outcome).toBe("changed");
	});

	it.each(["public", "private", "internal"] as const)(
		"updates visibility to %s when it differs from the current setting",
		async (targetVisibility) => {
			const currentVisibility =
				targetVisibility === "public" ? "private" : "public";
			const requestBodies: unknown[] = [];
			const fetchImplementation = createFetchImplementation((_url, init) => {
				const method = init.method ?? "GET";

				if (method === "GET") {
					return new Response(
						JSON.stringify(
							createManagedRepositoryResponse(false, currentVisibility)
						),
						{ status: 200, statusText: "OK" }
					);
				}

				requestBodies.push(JSON.parse(String(init.body)));

				return new Response("", { status: 200, statusText: "OK" });
			});

			const results = await manageGitHubRepositories(
				"token",
				"owner",
				[
					{
						actions: { ...noChangeActions, visibilityAction: targetVisibility },
						repository: "repo",
					},
				],
				fetchImplementation
			);

			expect(requestBodies).toEqual([{ visibility: targetVisibility }]);
			expect(results[0]?.visibility).toEqual({
				error: null,
				outcome: "changed",
				status: 200,
				statusText: "OK",
			});
		}
	);

	it("skips the PATCH request when archive and visibility already match", async () => {
		const requestedMethods: string[] = [];
		const fetchImplementation = createFetchImplementation((_url, init) => {
			const method = init.method ?? "GET";

			requestedMethods.push(method);

			return new Response(
				JSON.stringify(createManagedRepositoryResponse(true, "private")),
				{ status: 200, statusText: "OK" }
			);
		});

		const results = await manageGitHubRepositories(
			"token",
			"owner",
			[
				{
					actions: {
						archiveAction: "archived",
						subscriptionAction: "current",
						visibilityAction: "private",
					},
					repository: "repo",
				},
			],
			fetchImplementation
		);

		expect(requestedMethods).toEqual(["GET"]);
		expect(results[0]).toEqual({
			archive: {
				error: null,
				outcome: "unchanged",
				status: 0,
				statusText: "No change needed",
			},
			ok: true,
			repository: "repo",
			subscription: null,
			visibility: {
				error: null,
				outcome: "unchanged",
				status: 0,
				statusText: "No change needed",
			},
		});
	});

	it("sends a single PATCH request with both archive and visibility changes", async () => {
		const requestedMethods: string[] = [];
		const requestBodies: unknown[] = [];
		const fetchImplementation = createFetchImplementation((_url, init) => {
			const method = init.method ?? "GET";

			requestedMethods.push(method);

			if (method === "GET") {
				return new Response(
					JSON.stringify(createManagedRepositoryResponse(false, "public")),
					{ status: 200, statusText: "OK" }
				);
			}

			requestBodies.push(JSON.parse(String(init.body)));

			return new Response("", { status: 200, statusText: "OK" });
		});

		const results = await manageGitHubRepositories(
			"token",
			"owner",
			[
				{
					actions: {
						archiveAction: "archived",
						subscriptionAction: "current",
						visibilityAction: "private",
					},
					repository: "repo",
				},
			],
			fetchImplementation
		);

		expect(
			requestedMethods.filter((method) => method === "PATCH")
		).toHaveLength(1);
		expect(requestBodies).toEqual([{ archived: true, visibility: "private" }]);
		expect(results[0]?.ok).toBe(true);
		expect(results[0]?.archive?.outcome).toBe("changed");
		expect(results[0]?.visibility?.outcome).toBe("changed");
	});

	describe("notification subscription updates", () => {
		it("watches a repository that has no existing subscription", async () => {
			const methods: string[] = [];
			const requestBodies: unknown[] = [];
			const fetchImplementation = createFetchImplementation((url, init) => {
				const method = init.method ?? "GET";

				methods.push(method);

				if (url.endsWith("/subscription") && method === "GET") {
					return new Response("not found", {
						status: 404,
						statusText: "Not Found",
					});
				}

				requestBodies.push(JSON.parse(String(init.body)));

				return new Response("", { status: 200, statusText: "OK" });
			});

			const results = await manageGitHubRepositories(
				"token",
				"owner",
				[
					{
						actions: { ...noChangeActions, subscriptionAction: "watching" },
						repository: "repo",
					},
				],
				fetchImplementation
			);

			expect(methods).toEqual(["GET", "PUT"]);
			expect(requestBodies).toEqual([{ ignored: false, subscribed: true }]);
			expect(results[0]?.subscription).toEqual({
				error: null,
				outcome: "changed",
				status: 200,
				statusText: "OK",
			});
		});

		it("ignores a watched repository", async () => {
			const requestBodies: unknown[] = [];
			const fetchImplementation = createFetchImplementation((url, init) => {
				const method = init.method ?? "GET";

				if (url.endsWith("/subscription") && method === "GET") {
					return new Response(
						JSON.stringify(createSubscriptionResponse(true, false)),
						{ status: 200, statusText: "OK" }
					);
				}

				requestBodies.push(JSON.parse(String(init.body)));

				return new Response("", { status: 200, statusText: "OK" });
			});

			const results = await manageGitHubRepositories(
				"token",
				"owner",
				[
					{
						actions: { ...noChangeActions, subscriptionAction: "ignoring" },
						repository: "repo",
					},
				],
				fetchImplementation
			);

			expect(requestBodies).toEqual([{ ignored: true, subscribed: false }]);
			expect(results[0]?.subscription?.outcome).toBe("changed");
		});

		it("unwatches a repository by deleting the subscription", async () => {
			const methods: string[] = [];
			const fetchImplementation = createFetchImplementation((url, init) => {
				const method = init.method ?? "GET";

				methods.push(method);

				if (url.endsWith("/subscription") && method === "GET") {
					return new Response(
						JSON.stringify(createSubscriptionResponse(true, false)),
						{ status: 200, statusText: "OK" }
					);
				}

				return new Response(null, { status: 204, statusText: "No Content" });
			});

			const results = await manageGitHubRepositories(
				"token",
				"owner",
				[
					{
						actions: { ...noChangeActions, subscriptionAction: "unwatching" },
						repository: "repo",
					},
				],
				fetchImplementation
			);

			expect(methods).toEqual(["GET", "DELETE"]);
			expect(results[0]?.subscription).toEqual({
				error: null,
				outcome: "changed",
				status: 204,
				statusText: "No Content",
			});
		});

		it("skips the update when the subscription already matches the target state", async () => {
			const methods: string[] = [];
			const fetchImplementation = createFetchImplementation((_url, init) => {
				const method = init.method ?? "GET";

				methods.push(method);

				return new Response(
					JSON.stringify(createSubscriptionResponse(true, false)),
					{ status: 200, statusText: "OK" }
				);
			});

			const results = await manageGitHubRepositories(
				"token",
				"owner",
				[
					{
						actions: { ...noChangeActions, subscriptionAction: "watching" },
						repository: "repo",
					},
				],
				fetchImplementation
			);

			expect(methods).toEqual(["GET"]);
			expect(results[0]?.subscription).toEqual({
				error: null,
				outcome: "unchanged",
				status: 0,
				statusText: "No change needed",
			});
		});
	});

	it("retries a PATCH request after a rate-limited response", async () => {
		const sleepDurations: number[] = [];
		let patchAttempts = 0;
		const fetchImplementation = createFetchImplementation((_url, init) => {
			const method = init.method ?? "GET";

			if (method === "GET") {
				return new Response(
					JSON.stringify(createManagedRepositoryResponse(false, "public")),
					{ status: 200, statusText: "OK" }
				);
			}

			patchAttempts += 1;

			if (patchAttempts === 1) {
				return new Response("rate limited", {
					headers: {
						"Retry-After": "1",
						"X-RateLimit-Remaining": "0",
					},
					status: 403,
					statusText: "Forbidden",
				});
			}

			return new Response("", { status: 200, statusText: "OK" });
		});

		const results = await manageGitHubRepositories(
			"token",
			"owner",
			[
				{
					actions: { ...noChangeActions, archiveAction: "archived" },
					repository: "repo",
				},
			],
			fetchImplementation,
			{
				sleep: (durationMs) => {
					sleepDurations.push(durationMs);
					return Promise.resolve();
				},
			}
		);

		expect(patchAttempts).toBe(2);
		expect(sleepDurations).toEqual([1000]);
		expect(results[0]?.archive?.outcome).toBe("changed");
	});

	it("isolates a failure to one repository while preserving result order", async () => {
		const patchAttemptsByRepository: Record<string, number> = {};
		const fetchImplementation = createFetchImplementation((url, init) => {
			const method = init.method ?? "GET";

			if (method === "GET") {
				return new Response(
					JSON.stringify(createManagedRepositoryResponse(false, "public")),
					{ status: 200, statusText: "OK" }
				);
			}

			const repositoryMatch = url.match(MANAGED_REPOSITORY_PATH_PATTERN);
			const repository = repositoryMatch?.[1] ?? "unknown";

			patchAttemptsByRepository[repository] =
				(patchAttemptsByRepository[repository] ?? 0) + 1;

			if (repository === "repo-b") {
				return new Response(
					"you do not have permission to modify this repository",
					{ status: 403, statusText: "Forbidden" }
				);
			}

			return new Response("", { status: 200, statusText: "OK" });
		});

		const results = await manageGitHubRepositories(
			"token",
			"owner",
			["repo-a", "repo-b", "repo-c"].map((repository) => ({
				actions: { ...noChangeActions, archiveAction: "archived" },
				repository,
			})),
			fetchImplementation,
			{ sleep: () => Promise.resolve() }
		);

		expect(results.map((result) => result.repository)).toEqual([
			"repo-a",
			"repo-b",
			"repo-c",
		]);
		expect(patchAttemptsByRepository["repo-b"]).toBe(1);
		expect(results[0]?.ok).toBe(true);
		expect(results[1]?.ok).toBe(false);
		expect(results[1]?.archive?.outcome).toBe("failed");
		expect(results[1]?.archive?.error).toContain(
			"you do not have permission to modify this repository"
		);
		expect(results[2]?.ok).toBe(true);
	});

	it("only sends requests for the repositories that were listed", async () => {
		const requestedUrls: string[] = [];
		const fetchImplementation = createFetchImplementation((url, init) => {
			requestedUrls.push(url);

			const method = init.method ?? "GET";

			if (method === "GET") {
				return new Response(
					JSON.stringify(createManagedRepositoryResponse(false, "public")),
					{ status: 200, statusText: "OK" }
				);
			}

			return new Response("", { status: 200, statusText: "OK" });
		});

		await manageGitHubRepositories(
			"token",
			"owner",
			["repo-one", "repo-two"].map((repository) => ({
				actions: { ...noChangeActions, archiveAction: "archived" },
				repository,
			})),
			fetchImplementation
		);

		expect(requestedUrls.length).toBeGreaterThan(0);

		for (const url of requestedUrls) {
			expect(url.includes("repo-one") || url.includes("repo-two")).toBe(true);
		}
	});

	it("applies different actions to different repositories in one run", async () => {
		const requestsByRepository: Record<
			string,
			Array<{ method: string; url: string }>
		> = {
			"repo-a": [],
			"repo-b": [],
		};
		const fetchImplementation = createFetchImplementation((url, init) => {
			const method = init.method ?? "GET";
			const repository = url.includes("repo-a") ? "repo-a" : "repo-b";

			requestsByRepository[repository]?.push({ method, url });

			if (url.endsWith("/subscription") && method === "GET") {
				return new Response(
					JSON.stringify(createSubscriptionResponse(false, false)),
					{ status: 200, statusText: "OK" }
				);
			}

			if (url.endsWith("/subscription") && method === "PUT") {
				return new Response("", { status: 200, statusText: "OK" });
			}

			if (method === "GET") {
				return new Response(
					JSON.stringify(createManagedRepositoryResponse(false, "public")),
					{ status: 200, statusText: "OK" }
				);
			}

			return new Response("", { status: 200, statusText: "OK" });
		});

		const results = await manageGitHubRepositories(
			"token",
			"owner",
			[
				{
					actions: { ...noChangeActions, archiveAction: "archived" },
					repository: "repo-a",
				},
				{
					actions: { ...noChangeActions, subscriptionAction: "ignoring" },
					repository: "repo-b",
				},
			],
			fetchImplementation
		);

		expect(
			requestsByRepository["repo-a"].map((request) => request.method)
		).toEqual(["GET", "PATCH"]);
		expect(
			requestsByRepository["repo-a"].some((request) =>
				request.url.endsWith("/subscription")
			)
		).toBe(false);
		expect(
			requestsByRepository["repo-b"].map((request) => request.method)
		).toEqual(["GET", "PUT"]);
		expect(
			requestsByRepository["repo-b"].every((request) =>
				request.url.endsWith("/subscription")
			)
		).toBe(true);

		expect(results).toEqual([
			{
				archive: {
					error: null,
					outcome: "changed",
					status: 200,
					statusText: "OK",
				},
				ok: true,
				repository: "repo-a",
				subscription: null,
				visibility: null,
			},
			{
				archive: null,
				ok: true,
				repository: "repo-b",
				subscription: {
					error: null,
					outcome: "changed",
					status: 200,
					statusText: "OK",
				},
				visibility: null,
			},
		]);
	});
});

describe("listGitHubRepositoriesPage", () => {
	const node = (overrides: Record<string, unknown> = {}) => ({
		databaseId: 1,
		isArchived: false,
		isFork: false,
		isPrivate: true,
		name: "repo",
		nameWithOwner: "owner/repo",
		pushedAt: "2026-01-01T00:00:00Z",
		url: "https://github.com/owner/repo",
		viewerSubscription: "SUBSCRIBED",
		visibility: "PRIVATE",
		...overrides,
	});
	const respond = (
		nodes: Record<string, unknown>[],
		endCursor: string | null
	) =>
		new Response(
			JSON.stringify({
				data: {
					repositoryOwner: {
						repositories: {
							nodes,
							pageInfo: { endCursor, hasNextPage: endCursor !== null },
							totalCount: 368,
						},
					},
				},
			}),
			{ status: 200, statusText: "OK" }
		);

	it("maps nodes to repositories with their subscription state", async () => {
		const fetchImplementation = createFetchImplementation((url, init) => {
			expect(url).toBe("https://api.github.com/graphql");
			expect(JSON.parse(String(init.body)).variables).toEqual({
				cursor: null,
				first: 100,
				login: "owner",
			});

			return respond(
				[
					node(),
					node({
						databaseId: 2,
						isArchived: true,
						name: "internal",
						nameWithOwner: "owner/internal",
						viewerSubscription: "IGNORED",
						visibility: "INTERNAL",
					}),
					node({ databaseId: 3, name: "quiet", viewerSubscription: null }),
				],
				null
			);
		});

		const page = await listGitHubRepositoriesPage("token", "owner", {
			fetchImplementation,
		});

		expect(page.nextCursor).toBeNull();
		expect(page.totalCount).toBe(368);
		expect(page.repositories).toEqual([
			{
				archived: false,
				fork: false,
				fullName: "owner/repo",
				htmlUrl: "https://github.com/owner/repo",
				id: 1,
				name: "repo",
				private: true,
				pushedAt: "2026-01-01T00:00:00Z",
				subscription: "watching",
				visibility: "private",
			},
			expect.objectContaining({
				archived: true,
				id: 2,
				subscription: "ignoring",
				visibility: "internal",
			}),
			expect.objectContaining({ id: 3, subscription: null }),
		]);
	});

	it("passes the cursor and reports the next one", async () => {
		const fetchImplementation = createFetchImplementation((_url, init) => {
			expect(JSON.parse(String(init.body)).variables.cursor).toBe("c1");

			return respond([node()], "c2");
		});

		const page = await listGitHubRepositoriesPage("token", "owner", {
			cursor: "c1",
			fetchImplementation,
		});

		expect(page.nextCursor).toBe("c2");
	});

	it("throws the GraphQL error when the owner cannot be read", async () => {
		const fetchImplementation = createFetchImplementation(
			() =>
				new Response(
					JSON.stringify({
						data: { repositoryOwner: null },
						errors: [{ message: "Could not resolve to a RepositoryOwner" }],
					}),
					{ status: 200, statusText: "OK" }
				)
		);

		await expect(
			listGitHubRepositoriesPage("token", "owner", { fetchImplementation })
		).rejects.toThrow("Could not resolve to a RepositoryOwner");
	});
});

describe("getGitHubOrganizationSupportsInternal", () => {
	it("returns true for an organization on an enterprise plan", async () => {
		const fetchImplementation = createFetchImplementation((url) => {
			expect(url).toBe("https://api.github.com/orgs/acme");

			return new Response(JSON.stringify({ plan: { name: "Enterprise" } }), {
				status: 200,
				statusText: "OK",
			});
		});

		const supportsInternal = await getGitHubOrganizationSupportsInternal(
			"token",
			"acme",
			fetchImplementation
		);

		expect(supportsInternal).toBe(true);
	});

	it("returns false for an organization on a non-enterprise plan", async () => {
		const fetchImplementation = createFetchImplementation(
			() =>
				new Response(JSON.stringify({ plan: { name: "team" } }), {
					status: 200,
					statusText: "OK",
				})
		);

		const supportsInternal = await getGitHubOrganizationSupportsInternal(
			"token",
			"acme",
			fetchImplementation
		);

		expect(supportsInternal).toBe(false);
	});

	it("returns false when the plan field is missing", async () => {
		const fetchImplementation = createFetchImplementation(
			() =>
				new Response(JSON.stringify({}), {
					status: 200,
					statusText: "OK",
				})
		);

		const supportsInternal = await getGitHubOrganizationSupportsInternal(
			"token",
			"acme",
			fetchImplementation
		);

		expect(supportsInternal).toBe(false);
	});

	it("returns false for a personal account with no organization", async () => {
		const fetchImplementation = createFetchImplementation(
			() =>
				new Response("not found", {
					status: 404,
					statusText: "Not Found",
				})
		);

		const supportsInternal = await getGitHubOrganizationSupportsInternal(
			"token",
			"octocat",
			fetchImplementation
		);

		expect(supportsInternal).toBe(false);
	});
});
