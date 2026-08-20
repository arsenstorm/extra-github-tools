import { type RefObject, useEffect, useRef } from "react";

/**
 * Scrolls `ref` to the top of the scroll container whenever `page` changes,
 * so paging backwards doesn't leave the reader halfway down the new page.
 * The initial render is left alone.
 */
export function useScrollToPageTop(
	ref: RefObject<HTMLElement | null>,
	page: number
): void {
	const previousPageRef = useRef(page);

	useEffect(() => {
		if (previousPageRef.current === page) {
			return;
		}

		previousPageRef.current = page;
		ref.current?.scrollIntoView({ behavior: "auto", block: "start" });
	}, [page, ref]);
}
