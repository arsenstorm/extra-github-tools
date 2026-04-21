import { describe, expect, it } from "vitest";
import { transferGitHubRepositories } from "./github";

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
