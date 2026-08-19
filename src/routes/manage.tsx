import {
	createFileRoute,
	redirect,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAppSession } from "@/app-session";
import { ManagePageContent } from "@/components/manage/manage-page-content";
import { CONFIG } from "@/config";
import {
	getManagePageData,
	manageRepositoriesAction,
} from "@/server-functions";

interface ManageSearch {
	account?: string;
}

const normalizeSearchValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const validateManageSearch = (
	search: Record<string, unknown>
): ManageSearch => ({
	account: normalizeSearchValue(search.account),
});

export const Route = createFileRoute("/manage")({
	beforeLoad: () => {
		if (!CONFIG.bulkManageRepositories.enabled) {
			throw redirect({ to: "/" });
		}
	},
	component: ManageRoute,
	head: () => ({
		meta: [
			{
				title: "Bulk Manage Repositories - Extra GitHub Tools",
			},
			{
				content:
					"Archive, change visibility, and set notification levels for many repositories at once.",
				name: "description",
			},
		],
	}),
	loader: ({ deps }) => getManagePageData({ data: deps }),
	loaderDeps: ({ search }) => search,
	validateSearch: validateManageSearch,
});

function ManageRoute() {
	const appSession = useAppSession();
	const pageData = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const isLoadingManageData = useRouterState({
		select: (state) => state.location.pathname === "/manage" && state.isLoading,
	});
	const manageRepositories = useServerFn(manageRepositoriesAction);

	useEffect(() => {
		if (pageData.error) {
			toast.error(pageData.error);
		}
	}, [pageData.error]);

	return (
		<ManagePageContent
			account={search.account}
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isLoadingManageData={isLoadingManageData}
			isSignedIn={Boolean(appSession.session)}
			onManageChunk={async (repositories, actions) => {
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
						archiveAction: actions.archiveAction,
						repositories,
						subscriptionAction: actions.subscriptionAction,
						visibilityAction: actions.visibilityAction,
					},
				});
			}}
			onResetFlow={() =>
				navigate({
					search: {},
				})
			}
			onRunComplete={async (didChangeAnything) => {
				if (didChangeAnything) {
					await router.invalidate();
				}
			}}
			onSelectAccount={(accountHandle) =>
				navigate({
					search: {
						account: accountHandle,
					},
				})
			}
			pageData={pageData}
		/>
	);
}
