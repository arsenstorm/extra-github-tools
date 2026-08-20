import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import type { GitHubAccount } from "@/github/types";

export const normalizeSearchValue = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

/** Surfaces a loader error as a toast whenever it changes. */
export const usePageDataErrorToast = (error: string | null): void => {
	useEffect(() => {
		if (error) {
			toast.error(error);
		}
	}, [error]);
};

/**
 * Keeps an account handle from the URL only if it is one the viewer can pick.
 * A null account list (not signed in) can't be checked, so the value is kept.
 */
export const pickKnownAccount = (
	handle: string | undefined,
	accounts: GitHubAccount[] | null
): string | undefined => {
	if (!(handle && accounts)) {
		return handle;
	}

	return accounts.some((account) => account.handle === handle)
		? handle
		: undefined;
};

/**
 * The search params of the navigation in flight for `pathname`, if any.
 * `state.location` already points at the destination while its loader runs,
 * so callers can update pickers instantly and show a skeleton meanwhile.
 */
export const usePendingSearch = <Search>(
	pathname: string,
	validateSearch: (search: Record<string, unknown>) => Search
): { isNavigating: boolean; pendingSearch: Search } => {
	const isNavigating = useRouterState({
		select: (state) => state.location.pathname === pathname && state.isLoading,
	});
	const pendingRawSearch = useRouterState({
		select: (state) => state.location.search,
	});

	return {
		isNavigating,
		pendingSearch: validateSearch(pendingRawSearch as Record<string, unknown>),
	};
};
