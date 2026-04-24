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
import { TransferPageContent } from "@/components/transfer/transfer-page-content";
import {
	getTransferResultCounts,
	showTransferResultToast,
} from "@/components/transfer/utils";
import { CONFIG } from "@/config";
import {
	getTransferPageData,
	transferRepositoriesAction,
} from "@/server-functions";

interface TransferSearch {
	from?: string;
	to?: string;
}

const normalizeSearchValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const validateTransferSearch = (
	search: Record<string, unknown>
): TransferSearch => ({
	from: normalizeSearchValue(search.from),
	to: normalizeSearchValue(search.to),
});

export const Route = createFileRoute("/transfer")({
	component: TransferRoute,
	beforeLoad: () => {
		if (!CONFIG.bulkTransferRepositories.enabled) {
			throw redirect({ to: "/" });
		}
	},
	head: () => ({
		meta: [
			{
				title: "Bulk Transfer Repositories - Extra GitHub Tools",
			},
			{
				content:
					"Move your repositories in bulk between organizations and personal accounts.",
				name: "description",
			},
		],
	}),
	loader: ({ deps }) => getTransferPageData({ data: deps }),
	loaderDeps: ({ search }) => search,
	validateSearch: validateTransferSearch,
});

function TransferRoute() {
	const appSession = useAppSession();
	const pageData = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const isLoadingTransferData = useRouterState({
		select: (state) =>
			state.location.pathname === "/transfer" && state.isLoading,
	});
	const transferRepositories = useServerFn(transferRepositoriesAction);

	useEffect(() => {
		if (pageData.error) {
			toast.error(pageData.error);
		}
	}, [pageData.error]);

	return (
		<TransferPageContent
			from={search.from}
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isLoadingTransferData={isLoadingTransferData}
			isSignedIn={Boolean(appSession.session)}
			onResetFlow={() =>
				navigate({
					search: {},
				})
			}
			onSelectFrom={(fromAccount) =>
				navigate({
					search: {
						from: fromAccount,
						to: search.to === fromAccount ? undefined : search.to,
					},
				})
			}
			onSelectTo={(toAccount) =>
				navigate({
					search: {
						from: search.from,
						to: toAccount,
					},
				})
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
						archiveState: transferOptions.archiveState,
						from: search.from,
						namePrefix: transferOptions.namePrefix,
						nameSuffix: transferOptions.nameSuffix,
						repositories,
						to: search.to,
						visibility: transferOptions.visibility,
					},
				});

				showTransferResultToast(result);

				if (getTransferResultCounts(result).transferredCount > 0) {
					await router.invalidate();
				}

				return result;
			}}
			pageData={pageData}
			to={search.to}
		/>
	);
}
