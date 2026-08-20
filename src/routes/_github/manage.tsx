import {
	createFileRoute,
	getRouteApi,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppSession } from "@/app-session";
import { ManagePageContent } from "@/components/manage/manage-page-content";
import {
	normalizeSearchValue,
	pickKnownAccount,
	usePageDataErrorToast,
	usePendingSearch,
} from "@/route-utils";
import {
	getRepositoriesPage,
	manageRepositoriesAction,
} from "@/server-functions";
import { createToolRouteOptions, TOOLS } from "@/tools";

interface ManageSearch {
	account?: string;
}

type GitHubLayoutData = ReturnType<typeof githubRoute.useLoaderData>;

const PRELOAD_STALE_TIME_MS = 30_000;

const validateManageSearch = (
	search: Record<string, unknown>
): ManageSearch => ({
	account: normalizeSearchValue(search.account),
});

const githubRoute = getRouteApi("/_github");

export const Route = createFileRoute("/_github/manage")({
	...createToolRouteOptions(TOOLS.manage),
	component: ManageRoute,
	// The account list comes from the parent route; the repository list is
	// returned as a promise so the page renders (with a skeleton) while it loads.
	loader: async ({
		deps,
		parentMatchPromise,
	}: {
		deps: ManageSearch;
		parentMatchPromise: Promise<{ loaderData?: GitHubLayoutData }>;
	}) => {
		const { loaderData } = await parentMatchPromise;
		const accounts = loaderData?.accounts ?? null;
		const viewerLogin = loaderData?.viewerLogin;
		const account = pickKnownAccount(deps.account, accounts);

		// An account that isn't in the picker (typo, lost access) is cleared
		// from the URL rather than shown as an empty list.
		if (deps.account && !account) {
			throw redirect({ replace: true, search: {}, to: "/manage" });
		}

		// Only the first page is deferred here; the section pulls the rest.
		const repositoriesData = account
			? getRepositoriesPage({ data: { account, viewerLogin } })
			: null;

		return { repositoriesData };
	},
	loaderDeps: ({ search }): ManageSearch => ({ account: search.account }),
	// Keep a hover-preloaded list fresh long enough for the click to use it.
	preloadStaleTime: PRELOAD_STALE_TIME_MS,
	staleTime: PRELOAD_STALE_TIME_MS,
	validateSearch: validateManageSearch,
});

function ManageRoute() {
	const appSession = useAppSession();
	const { accounts, error, viewerLogin } = githubRoute.useLoaderData();
	const { repositoriesData } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const { isNavigating, pendingSearch } = usePendingSearch(
		"/manage",
		validateManageSearch
	);
	// Only a different account loads a new list, so only that shows the skeleton.
	const isLoadingRepositories =
		isNavigating && pendingSearch.account !== search.account;
	const manageRepositories = useServerFn(manageRepositoriesAction);
	const loadRepositoriesPage = useServerFn(getRepositoriesPage);

	usePageDataErrorToast(error);

	return (
		<ManagePageContent
			account={isNavigating ? pendingSearch.account : search.account}
			accounts={accounts}
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isLoadingRepositories={isLoadingRepositories}
			isSignedIn={Boolean(appSession.session)}
			onLoadPage={(cursor) =>
				loadRepositoriesPage({
					data: { account: search.account ?? "", cursor, viewerLogin },
				})
			}
			onManageChunk={async (changes) => {
				if (!search.account) {
					return {
						error: "Choose an account.",
						results: null,
						success: false,
					};
				}

				return await manageRepositories({
					data: {
						account: search.account,
						changes,
					},
				});
			}}
			onPreloadAccount={(accountHandle) => {
				router
					.preloadRoute({ search: { account: accountHandle }, to: "/manage" })
					.catch(() => {
						// Preloading is best-effort; the click still loads normally.
					});
			}}
			onRunComplete={async (didChangeAnything) => {
				if (didChangeAnything) {
					// Only this route's list and sweep changed; the session and
					// account list don't need to be reloaded.
					await router.invalidate({
						filter: (match) => match.routeId === Route.id,
					});
				}
			}}
			onSelectAccount={(accountHandle) =>
				navigate({ search: { account: accountHandle } })
			}
			repositoriesData={repositoriesData}
		/>
	);
}
