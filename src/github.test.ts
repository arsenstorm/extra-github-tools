import { describe, expect, it } from "vitest";
import {
	analyzeGitHubRepository,
	isGitHubContributorStatsPendingError,
	listGitHubRepositories,
	transferGitHubRepositories,
} from "./github";

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

describe("listGitHubRepositories", () => {
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
					additions: 11,
					commits: 3,
					deletions: 4,
					email: "alice@users.noreply.github.com",
					files: 1,
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
