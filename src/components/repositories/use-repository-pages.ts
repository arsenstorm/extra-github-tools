import { useEffect, useMemo, useRef, useState } from "react";
import type { GitHubRepository } from "@/github/types";
import type { RepositoriesPage } from "@/server-functions";

export interface RepositoryPagesState {
	error: string | null;
	/** More pages are still being fetched and appended. */
	isLoadingMore: boolean;
	repositories: GitHubRepository[];
	supportsInternalVisibility: boolean;
	/** How many repositories the account has, known from the first page. */
	totalCount: number;
}

interface PagesState {
	error: string | null;
	/** Content key of the first page these pages were accumulated from. */
	firstPageKey: string;
	pages: RepositoriesPage[];
}

/**
 * The router hands back a structurally-cloned copy of deferred data once it
 * settles, so identity can't tell a refresh from a re-render; content can.
 */
const getPageKey = (page: RepositoriesPage): string => JSON.stringify(page);

const LOAD_MORE_ERROR = "Failed to load more repositories.";

/**
 * Accumulates an account's repositories page by page. The first page comes
 * from the route loader so the table renders immediately; the remaining
 * cursors are fetched in order and appended as they arrive. A new first page
 * (a refresh) restarts the sequence.
 */
export function useRepositoryPages(
	firstPage: RepositoriesPage,
	loadPage: (cursor: string) => Promise<RepositoriesPage>
): RepositoryPagesState {
	const firstPageKey = useMemo(() => getPageKey(firstPage), [firstPage]);
	const [state, setState] = useState<PagesState>({
		error: null,
		firstPageKey,
		pages: [firstPage],
	});
	const loadPageRef = useRef(loadPage);
	// React re-runs effects when a Suspense boundary re-reveals mounted
	// children, so a cursor's request is cached and reused instead of re-sent.
	const requestsRef = useRef(new Map<string, Promise<RepositoriesPage>>());

	loadPageRef.current = loadPage;

	if (state.firstPageKey !== firstPageKey) {
		setState({ error: null, firstPageKey, pages: [firstPage] });
	}

	const nextCursor = state.pages.at(-1)?.nextCursor ?? null;

	useEffect(() => {
		if (!nextCursor) {
			return;
		}

		let isCurrent = true;
		const requestKey = `${firstPageKey.length}:${nextCursor}`;
		const request =
			requestsRef.current.get(requestKey) ?? loadPageRef.current(nextCursor);

		requestsRef.current.set(requestKey, request);
		request
			.then((page) => {
				if (!isCurrent) {
					return;
				}

				setState((previous) =>
					previous.firstPageKey === firstPageKey
						? {
								...previous,
								error: page.error,
								pages: [...previous.pages, page],
							}
						: previous
				);
			})
			.catch(() => {
				if (isCurrent) {
					setState((previous) => ({ ...previous, error: LOAD_MORE_ERROR }));
				}
			});

		return () => {
			isCurrent = false;
		};
	}, [nextCursor, firstPageKey]);

	const repositories = useMemo(
		() => state.pages.flatMap((page) => page.repositories ?? []),
		[state.pages]
	);

	return {
		error: state.error ?? firstPage.error,
		isLoadingMore: nextCursor !== null,
		repositories,
		supportsInternalVisibility: state.pages.some(
			(page) => page.supportsInternalVisibility
		),
		totalCount: Math.max(firstPage.totalCount, repositories.length),
	};
}
