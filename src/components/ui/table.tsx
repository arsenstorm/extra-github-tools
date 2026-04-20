"use client";

import { clsx } from "clsx";
import React, { createContext, useContext, useState } from "react";

const TableContext = createContext<{
	bleed: boolean;
	dense: boolean;
	grid: boolean;
	striped: boolean;
}>({
	bleed: false,
	dense: false,
	grid: false,
	striped: false,
});

export function Table({
	bleed = false,
	dense = false,
	grid = false,
	striped = false,
	className,
	children,
	...props
}: {
	bleed?: boolean;
	dense?: boolean;
	grid?: boolean;
	striped?: boolean;
} & Readonly<React.ComponentPropsWithoutRef<"div">>) {
	const value = React.useMemo(
		() => ({ bleed, dense, grid, striped }),
		[bleed, dense, grid, striped]
	);

	return (
		<TableContext.Provider
			value={value as React.ContextType<typeof TableContext>}
		>
			<div className="flow-root">
				<div
					{...props}
					className={clsx(
						className,
						"-mx-(--gutter) overflow-x-auto whitespace-nowrap"
					)}
				>
					<div
						className={clsx(
							"inline-block min-w-full align-middle",
							!bleed && "sm:px-(--gutter)"
						)}
					>
						<table className="min-w-full text-left text-sm/6">{children}</table>
					</div>
				</div>
			</div>
		</TableContext.Provider>
	);
}

export function TableHead({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"thead">>) {
	return (
		<thead
			className={clsx(className, "text-zinc-500 dark:text-zinc-400")}
			{...props}
		/>
	);
}

export function TableBody(
	props: Readonly<React.ComponentPropsWithoutRef<"tbody">>
) {
	return <tbody {...props} />;
}

const TableRowContext = createContext<{
	href?: string;
	target?: string;
	title?: string;
}>({
	href: undefined,
	target: undefined,
	title: undefined,
});

export function TableRow({
	href,
	target,
	title,
	className,
	children,
	...props
}: {
	href?: string;
	target?: string;
	title?: string;
} & React.ComponentPropsWithoutRef<"tr">) {
	const { striped } = useContext(TableContext);

	const value = React.useMemo(
		() => ({ href, target, title }),
		[href, target, title]
	);

	return (
		<TableRowContext.Provider
			value={value as React.ContextType<typeof TableRowContext>}
		>
			<tr
				{...props}
				className={clsx(
					className,
					href &&
						"has-[[data-row-link][data-focus]]:outline has-[[data-row-link][data-focus]]:outline-2 has-[[data-row-link][data-focus]]:outline-blue-500 has-[[data-row-link][data-focus]]:-outline-offset-2 dark:focus-within:bg-white/2.5",
					striped && "even:bg-zinc-950/2.5 dark:even:bg-white/2.5",
					href && striped && "hover:bg-zinc-950/5 dark:hover:bg-white/5",
					href && !striped && "hover:bg-zinc-950/2.5 dark:hover:bg-white/2.5"
				)}
			>
				{children}
			</tr>
		</TableRowContext.Provider>
	);
}

export function TableHeader({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"th">>) {
	const { bleed, grid } = useContext(TableContext);

	return (
		<th
			{...props}
			className={clsx(
				className,
				"border-b-2 border-b-zinc-950/10 px-4 py-2 font-medium first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2)) dark:border-b-white/10",
				grid &&
					"border-l-2 border-l-zinc-950/5 first:border-l-0 dark:border-l-white/5",
				!bleed && "sm:last:pr-2 sm:first:pl-2"
			)}
		/>
	);
}

export function TableCell({
	className,
	children,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"td">>) {
	const { bleed, dense, grid, striped } = useContext(TableContext);
	const { href, target, title } = useContext(TableRowContext);
	const [cellRef, setCellRef] = useState<HTMLElement | null>(null);

	return (
		<td
			ref={href ? setCellRef : undefined}
			{...props}
			className={clsx(
				className,
				"relative px-4 first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2))",
				!striped && "border-zinc-950/5 border-b-2 dark:border-white/5",
				grid &&
					"border-l-2 border-l-zinc-950/5 first:border-l-0 dark:border-l-white/5",
				dense ? "py-2.5" : "py-4",
				!bleed && "sm:last:pr-2 sm:first:pl-2"
			)}
		>
			{href && (
				<a
					aria-label={title}
					className="absolute inset-0 focus:outline-none"
					data-row-link
					href={href}
					tabIndex={cellRef?.previousElementSibling === null ? 0 : -1}
					target={target}
				>
					<span className="sr-only">{title ?? "Open row"}</span>
				</a>
			)}
			{children}
		</td>
	);
}
