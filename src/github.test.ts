import { describe, expect, it } from "vitest";
import {
	analyzeGitHubRepository,
	isGitHubContributorStatsPendingError,
	listGitHubRepositories,
	listGitHubWatchedRepositoryFullNames,
	manageGitHubRepositories,
	transferGitHubRepositories,
} from "./github";

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
			["repo"],
			{ ...noChangeActions, archiveAction: "archived" },
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
			["repo"],
			{ ...noChangeActions, archiveAction: "unarchived" },
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
				["repo"],
				{ ...noChangeActions, visibilityAction: targetVisibility },
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
			["repo"],
			{
				archiveAction: "archived",
				subscriptionAction: "current",
				visibilityAction: "private",
			},
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
			["repo"],
			{
				archiveAction: "archived",
				subscriptionAction: "current",
				visibilityAction: "private",
			},
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
				["repo"],
				{ ...noChangeActions, subscriptionAction: "watching" },
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
				["repo"],
				{ ...noChangeActions, subscriptionAction: "ignoring" },
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
				["repo"],
				{ ...noChangeActions, subscriptionAction: "unwatching" },
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
				["repo"],
				{ ...noChangeActions, subscriptionAction: "watching" },
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
			["repo"],
			{ ...noChangeActions, archiveAction: "archived" },
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
			["repo-a", "repo-b", "repo-c"],
			{ ...noChangeActions, archiveAction: "archived" },
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
			["repo-one", "repo-two"],
			{ ...noChangeActions, archiveAction: "archived" },
			fetchImplementation
		);

		expect(requestedUrls.length).toBeGreaterThan(0);

		for (const url of requestedUrls) {
			expect(url.includes("repo-one") || url.includes("repo-two")).toBe(true);
		}
	});
});

describe("listGitHubWatchedRepositoryFullNames", () => {
	it("returns the full names of watched repositories", async () => {
		const fetchImplementation = createFetchImplementation((url) => {
			expect(url).toBe(
				"https://api.github.com/user/subscriptions?page=1&per_page=100"
			);

			return new Response(
				JSON.stringify([
					{ full_name: "owner/repo-one" },
					{ full_name: "owner/repo-two" },
				]),
				{ status: 200, statusText: "OK" }
			);
		});

		const fullNames = await listGitHubWatchedRepositoryFullNames(
			"token",
			fetchImplementation
		);

		expect(fullNames).toEqual(["owner/repo-one", "owner/repo-two"]);
	});

	it("paginates when the first page is full", async () => {
		const requestedUrls: string[] = [];
		const firstPageRepositories = Array.from(
			{ length: 100 },
			(_item, index) => ({
				full_name: `owner/repo-${index}`,
			})
		);
		const fetchImplementation = createFetchImplementation((url) => {
			requestedUrls.push(url);

			const page = new URL(url).searchParams.get("page");

			return new Response(
				JSON.stringify(
					page === "1"
						? firstPageRepositories
						: [{ full_name: "owner/repo-100" }]
				),
				{ status: 200, statusText: "OK" }
			);
		});

		const fullNames = await listGitHubWatchedRepositoryFullNames(
			"token",
			fetchImplementation
		);

		expect(requestedUrls).toEqual([
			"https://api.github.com/user/subscriptions?page=1&per_page=100",
			"https://api.github.com/user/subscriptions?page=2&per_page=100",
		]);
		expect(fullNames).toHaveLength(101);
		expect(fullNames.at(-1)).toBe("owner/repo-100");
	});
});
