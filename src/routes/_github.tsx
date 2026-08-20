import { createFileRoute } from "@tanstack/react-router";
import type { AppSessionData } from "@/auth.server";
import { getGitHubAccounts } from "@/server-functions";

/**
 * Shared data for the repository tools. The account list is loaded once here
 * and reused by every child route, so switching accounts doesn't refetch it.
 */
export const Route = createFileRoute("/_github")({
	loader: async ({ parentMatchPromise }) => {
		const rootMatch = await parentMatchPromise;
		const viewer = (rootMatch.loaderData as AppSessionData | undefined)?.github
			?.viewer;
		const accountsData = await getGitHubAccounts({
			data: { viewer: viewer ?? undefined },
		});

		return { ...accountsData, viewerLogin: viewer?.login };
	},
	// Account membership rarely changes; a full reload or an unfiltered
	// invalidate refreshes it, child invalidations don't.
	staleTime: Number.POSITIVE_INFINITY,
});
