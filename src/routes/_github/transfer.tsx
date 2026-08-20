import {
	createFileRoute,
	getRouteApi,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppSession } from "@/app-session";
import { TransferPageContent } from "@/components/transfer/transfer-page-content";
import {
	getTransferResultCounts,
	showTransferResultToast,
} from "@/components/transfer/utils";
import {
	normalizeSearchValue,
	pickKnownAccount,
	usePageDataErrorToast,
	usePendingSearch,
} from "@/route-utils";
import {
	getRepositoriesPage,
	transferRepositoriesAction,
} from "@/server-functions";
import { createToolRouteOptions, TOOLS } from "@/tools";

interface TransferSearch {
	from?: string;
	to?: string;
}

const validateTransferSearch = (
	search: Record<string, unknown>
): TransferSearch => ({
	from: normalizeSearchValue(search.from),
	to: normalizeSearchValue(search.to),
});

const githubRoute = getRouteApi("/_github");

type GitHubLayoutData = ReturnType<typeof githubRoute.useLoaderData>;

const PRELOAD_STALE_TIME_MS = 30_000;

export const Route = createFileRoute("/_github/transfer")({
	...createToolRouteOptions(TOOLS.transfer),
	component: TransferRoute,
	// The account list comes from the parent route; the repository list is
	// returned as a promise so the page renders (with a skeleton) while it loads.
	// Only the source account affects the list.
	loader: async ({
		deps,
		location,
		parentMatchPromise,
	}: {
		deps: Pick<TransferSearch, "from">;
		location: { search: Record<string, unknown> };
		parentMatchPromise: Promise<{ loaderData?: GitHubLayoutData }>;
	}) => {
		const { loaderData } = await parentMatchPromise;
		const accounts = loaderData?.accounts ?? null;
		const requested = validateTransferSearch(location.search);
		const from = pickKnownAccount(deps.from, accounts);
		const to = pickKnownAccount(requested.to, accounts);

		// Accounts that aren't in the pickers (typo, lost access) are cleared
		// from the URL rather than shown as an empty list.
		if (from !== deps.from || to !== requested.to) {
			throw redirect({ replace: true, search: { from, to }, to: "/transfer" });
		}

		// Only the first page is deferred here; the section pulls the rest.
		return {
			repositoriesData: from
				? getRepositoriesPage({
						data: { account: from, viewerLogin: loaderData?.viewerLogin },
					})
				: null,
		};
	},
	loaderDeps: ({ search }): Pick<TransferSearch, "from"> => ({
		from: search.from,
	}),
	// Keep a hover-preloaded list fresh long enough for the click to use it.
	preloadStaleTime: PRELOAD_STALE_TIME_MS,
	staleTime: PRELOAD_STALE_TIME_MS,
	validateSearch: validateTransferSearch,
});

function TransferRoute() {
	const appSession = useAppSession();
	const {
		accounts: accountList,
		error,
		viewerLogin,
	} = githubRoute.useLoaderData();
	const { repositoriesData } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const { isNavigating, pendingSearch } = usePendingSearch(
		"/transfer",
		validateTransferSearch
	);
	const accounts = isNavigating ? pendingSearch : search;
	// Only a source change loads a new list, so only that shows the skeleton.
	const isLoadingRepositories =
		isNavigating && pendingSearch.from !== search.from;
	const transferRepositories = useServerFn(transferRepositoriesAction);
	const loadRepositoriesPage = useServerFn(getRepositoriesPage);

	usePageDataErrorToast(error);

	return (
		<TransferPageContent
			accounts={accountList}
			from={accounts.from}
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isLoadingRepositories={isLoadingRepositories}
			isSignedIn={Boolean(appSession.session)}
			onLoadPage={(cursor) =>
				loadRepositoriesPage({
					data: { account: accounts.from ?? "", cursor, viewerLogin },
				})
			}
			onPreloadSource={(fromAccount) => {
				router
					.preloadRoute({
						search: { from: fromAccount, to: accounts.to },
						to: "/transfer",
					})
					.catch(() => {
						// Preloading is best-effort; the click still loads normally.
					});
			}}
			onSelectFrom={(fromAccount) =>
				navigate({
					search: {
						from: fromAccount,
						to: accounts.to === fromAccount ? undefined : accounts.to,
					},
				})
			}
			onSelectTo={(toAccount) =>
				navigate({ search: { from: accounts.from, to: toAccount } })
			}
			onTransfer={async (repositories, transferOptions) => {
				if (!(search.from && search.to)) {
					return {
						error: "Choose both a source and destination account.",
						results: null,
						success: false,
					};
				}

				const result = await transferRepositories({
					data: {
						...transferOptions,
						from: search.from,
						repositories,
						to: search.to,
					},
				});

				showTransferResultToast(result);

				if (getTransferResultCounts(result).transferredCount > 0) {
					// Only this route's list changed; the session and account list
					// don't need to be reloaded.
					await router.invalidate({
						filter: (match) => match.routeId === Route.id,
					});
				}

				return result;
			}}
			repositoriesData={repositoriesData}
			to={accounts.to}
		/>
	);
}
