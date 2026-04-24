import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAppSession } from "@/app-session";
import { FamePageContent } from "@/components/fame/fame-page-content";
import { FamePendingState } from "@/components/fame/fame-pending-state";
import { CONFIG } from "@/config";
import { getFamePageData } from "@/server-functions";

interface FameSearch {
	org?: string;
	repo?: string;
}

const FAME_STATS_PENDING_REFRESH_MS = 5000;

const normalizeSearchValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const validateFameSearch = (search: Record<string, unknown>): FameSearch => ({
	org: normalizeSearchValue(search.org),
	repo: normalizeSearchValue(search.repo),
});

export const Route = createFileRoute("/fame")({
	component: FameRoute,
	beforeLoad: () => {
		if (!CONFIG.commitFame.enabled) {
			throw redirect({ to: "/" });
		}
	},
	head: () => ({
		meta: [
			{
				title: "Commit Fame - Extra GitHub Tools",
			},
			{
				content:
					"See how your commits compare to your colleagues and who's doing more.",
				name: "description",
			},
		],
	}),
	loader: ({ deps }) => getFamePageData({ data: deps }),
	loaderDeps: ({ search }) => search,
	pendingComponent: FamePendingState,
	pendingMs: 0,
	validateSearch: validateFameSearch,
});

function FameRoute() {
	const appSession = useAppSession();
	const pageData = Route.useLoaderData();
	const router = useRouter();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	useEffect(() => {
		if (pageData.error) {
			toast.error(pageData.error);
		}
	}, [pageData.error]);

	useEffect(() => {
		if (!(pageData.statsPending && search.org && search.repo)) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			router.invalidate().catch((error: unknown) => {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to refresh repository statistics."
				);
			});
		}, FAME_STATS_PENDING_REFRESH_MS);

		return () => window.clearTimeout(timeoutId);
	}, [pageData.statsPending, router, search.org, search.repo]);

	return (
		<FamePageContent
			hasGitHubAccess={Boolean(appSession.github?.hasAccessToken)}
			isSignedIn={Boolean(appSession.session)}
			onSelectOrganization={(organizationHandle) =>
				navigate({
					search: {
						org: organizationHandle,
						repo: undefined,
					},
				})
			}
			onSelectRepository={(repositoryName) =>
				navigate({
					search: {
						org: search.org,
						repo: repositoryName,
					},
				})
			}
			org={search.org}
			pageData={pageData}
			repo={search.repo}
		/>
	);
}
