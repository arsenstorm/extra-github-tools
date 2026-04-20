import { createServerFn } from "@tanstack/react-start";

export const getHomePageData = createServerFn({ method: "GET" }).handler(
	async () => {
		const [
			{ getRequestHeaders },
			{ auth },
			{ getGitHubAccessTokenFromHeaders, toSessionSummary },
			{ getGitHubViewer },
		] = await Promise.all([
			import("@tanstack/react-start/server"),
			import("./auth"),
			import("./auth.server"),
			import("./github"),
		]);

		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });
		const sessionSummary = toSessionSummary(session);

		if (!sessionSummary) {
			return {
				github: null,
				session: null,
			};
		}

		const githubAuth = await getGitHubAccessTokenFromHeaders(headers);

		if (!githubAuth) {
			return {
				github: null,
				session: sessionSummary,
			};
		}

		const viewer = await getGitHubViewer(githubAuth.accessToken);

		return {
			github: {
				scopes: githubAuth.scopes,
				viewer,
			},
			session: sessionSummary,
		};
	}
);
