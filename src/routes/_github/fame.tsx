import {
	createFileRoute,
	getRouteApi,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { useAppSession } from "@/app-session";
import { FamePageContent } from "@/components/fame/fame-page-content";
import { useStatsPendingRetry } from "@/components/fame/use-stats-pending-retry";
import {
	normalizeSearchValue,
	pickKnownAccount,
	usePageDataErrorToast,
	usePendingSearch,
} from "@/route-utils";
import {
	type FamePageData,
	getFamePageData,
	getRepositoriesPage,
} from "@/server-functions";
import { createToolRouteOptions, TOOLS } from "@/tools";

interface FameSearch {
	bots?: true;
	org?: string;
	repo?: string;
}

type FameLoaderDeps = Pick<FameSearch, "org" | "repo">;

type GitHubLayoutData = ReturnType<typeof githubRoute.useLoaderData>;

const PRELOAD_STALE_TIME_MS = 30_000;

const EMPTY_PAGE_DATA: FamePageData = {
	error: null,
	stats: null,
	statsPending: false,
};

const validateFameSearch = (search: Record<string, unknown>): FameSearch => ({
	bots: search.bots === true || search.bots === "true" ? true : undefined,
	org: normalizeSearchValue(search.org),
	repo: normalizeSearchValue(search.repo),
});

const githubRoute = getRouteApi("/_github");

export const Route = createFileRoute("/_github/fame")({
	...createToolRouteOptions(TOOLS.fame),
	component: FameRoute,
	// The account list comes from the parent route. The repository list is
	// returned as a promise so the page renders (with a skeleton) while it
	// loads; an analysis is awaited so the page lands with its numbers.
	loader: async ({
		deps,
		parentMatchPromise,
	}: {
		deps: FameLoaderDeps;
		parentMatchPromise: Promise<{ loaderData?: GitHubLayoutData }>;
	}) => {
		const { loaderData } = await parentMatchPromise;
		const viewerLogin = loaderData?.viewerLogin;
		const org = pickKnownAccount(deps.org, loaderData?.accounts ?? null);

		// An account that isn't in the picker (typo, lost access) is cleared
		// from the URL rather than shown as an empty list.
		if (deps.org && !org) {
			throw redirect({ replace: true, search: {}, to: "/fame" });
		}

		if (org && deps.repo) {
			return {
				pageData: await getFamePageData({ data: { org, repo: deps.repo } }),
				repositoriesData: null,
			};
		}

		return {
			pageData: EMPTY_PAGE_DATA,
			// Only the first page is deferred here; the section pulls the rest.
			repositoriesData: org
				? getRepositoriesPage({ data: { account: org, viewerLogin } })
				: null,
		};
	},
	// Only the repository selection needs a fresh load; display options do not.
	loaderDeps: ({ search }): FameLoaderDeps => ({
		org: search.org,
		repo: search.repo,
	}),
	// Keep a hover-preloaded list fresh long enough for the click to use it.
	preloadStaleTime: PRELOAD_STALE_TIME_MS,
	staleTime: PRELOAD_STALE_TIME_MS,
	validateSearch: validateFameSearch,
});

function FameRoute() {
	const appSession = useAppSession();
	const {
		accounts,
		error: accountsError,
		viewerLogin,
	} = githubRoute.useLoaderData();
	const { pageData, repositoriesData } = Route.useLoaderData();
	const router = useRouter();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { isNavigating, pendingSearch } = usePendingSearch(
		"/fame",
		validateFameSearch
	);
	// Show the picker's destination right away; only a different account loads
	// a new list, and only a different repository loads a new analysis.
	const org = isNavigating ? pendingSearch.org : search.org;
	const repo = isNavigating ? pendingSearch.repo : search.repo;
	const isLoadingRepositories =
		isNavigating && pendingSearch.org !== search.org;
	const isAnalyzing =
		isNavigating &&
		Boolean(pendingSearch.repo) &&
		(pendingSearch.repo !== search.repo || pendingSearch.org !== search.org);
	const loadRepositoriesPage = useServerFn(getRepositoriesPage);

	usePageDataErrorToast(accountsError);
	usePageDataErrorToast(pageData.error);

	const refresh = useCallback(() => router.invalidate(), [router]);
	const pendingRetry = useStatsPendingRetry({
		enabled: Boolean(pageData.statsPending && search.org && search.repo),
		refresh,
		targetKey: `${search.org ?? ""}/${search.repo ?? ""}`,
	});

	return (
		<FamePageContent
			accounts={accounts}
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isAnalyzing={isAnalyzing}
			isLoadingRepositories={isLoadingRepositories}
			isSignedIn={Boolean(appSession.session)}
			onClearRepository={() =>
				navigate({
					search: (previous) => ({ ...previous, repo: undefined }),
				})
			}
			onLoadPage={(cursor) =>
				loadRepositoriesPage({
					data: { account: search.org ?? "", cursor, viewerLogin },
				})
			}
			onPreloadAccount={(accountHandle) => {
				router
					.preloadRoute({ search: { org: accountHandle }, to: "/fame" })
					.catch(() => {
						// Preloading is best-effort; the click still loads normally.
					});
			}}
			onSelectAccount={(accountHandle) =>
				navigate({
					search: (previous) => ({
						...previous,
						org: accountHandle,
						repo: undefined,
					}),
				})
			}
			onSelectRepository={(repositoryName) =>
				navigate({
					search: (previous) => ({ ...previous, repo: repositoryName }),
				})
			}
			onShowBotsChange={(showBots) =>
				navigate({
					replace: true,
					search: (previous) => ({
						...previous,
						bots: showBots ? true : undefined,
					}),
				})
			}
			org={org}
			pageData={pageData}
			pendingRetry={pendingRetry}
			repo={repo}
			repositoriesData={repositoriesData}
			showBots={search.bots === true}
			viewerLogin={viewerLogin}
		/>
	);
}
