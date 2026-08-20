"use client";

import { type LinkProps, Link as RouterLink } from "@tanstack/react-router";
import type React from "react";

const PROTOCOL_RELATIVE_PREFIX = "//";

/**
 * An href is internal when it is a root-relative path inside this app.
 * Absolute URLs, protocol-relative URLs, mailto:, hash links, and links that
 * open a new tab all fall back to a plain anchor.
 */
export const isInternalHref = (
	href: string,
	target?: React.HTMLAttributeAnchorTarget
): boolean =>
	href.startsWith("/") &&
	!href.startsWith(PROTOCOL_RELATIVE_PREFIX) &&
	(target === undefined || target === "_self");

/**
 * Renders a TanStack Router `Link` for internal hrefs (client-side navigation
 * with intent preloading) and a plain anchor for everything else.
 */
export function Link({
	href,
	ref,
	...props
}: Readonly<
	React.ComponentPropsWithoutRef<"a"> & {
		href: string;
		ref?: React.Ref<HTMLAnchorElement>;
	}
>) {
	if (isInternalHref(href, props.target)) {
		return <RouterLink {...props} ref={ref} to={href as LinkProps["to"]} />;
	}

	return <a {...props} href={href} ref={ref} />;
}
