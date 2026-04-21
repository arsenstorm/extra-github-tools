"use client";

import {
	Button as HeadlessButton,
	type ButtonProps as HeadlessButtonProps,
} from "@headlessui/react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { LayoutGroup, motion } from "framer-motion";
import type React from "react";
import { useId } from "react";
import { TouchTarget } from "./button";

export function Navbar({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"nav">>) {
	return (
		<nav
			{...props}
			className={clsx(className, "flex flex-1 items-center gap-4 py-2.5")}
		/>
	);
}

export function NavbarDivider({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	return (
		<div
			aria-hidden="true"
			{...props}
			className={clsx(className, "h-6 w-px bg-zinc-950/10 dark:bg-white/10")}
		/>
	);
}

export function NavbarSection({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	const id = useId();

	return (
		<LayoutGroup id={id}>
			<div {...props} className={clsx(className, "flex items-center gap-3")} />
		</LayoutGroup>
	);
}

export function NavbarSpacer({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	return (
		<div
			aria-hidden="true"
			{...props}
			className={clsx(className, "-ml-4 flex-1")}
		/>
	);
}

type NavbarItemProps = {
	children: React.ReactNode;
	className?: string;
	current?: boolean;
	ref?: React.Ref<HTMLAnchorElement> | React.Ref<HTMLButtonElement>;
} & (
	| Omit<HeadlessButtonProps, "className" | "ref">
	| (Omit<React.ComponentPropsWithoutRef<typeof Link>, "className" | "ref"> & {
			href?: never;
	  })
	| (Omit<React.ComponentPropsWithoutRef<"a">, "className" | "ref"> & {
			href: string;
			to?: never;
	  })
);

export const NavbarItem = function NavbarItem({
	current,
	className,
	children,
	ref,
	...props
}: NavbarItemProps) {
	const classes = clsx(
		// Base
		"relative flex min-w-0 items-center gap-3 rounded-lg p-2 text-left font-medium text-base/6 text-zinc-950 sm:text-sm/5",
		// Leading icon/icon-only
		"data-[slot=icon]:*:size-6 data-[slot=icon]:*:shrink-0 data-[slot=icon]:*:fill-zinc-500 sm:data-[slot=icon]:*:size-5",
		// Trailing icon (down chevron or similar)
		"data-[slot=icon]:last:not-nth-2:*:ml-auto data-[slot=icon]:last:not-nth-2:*:size-5 sm:data-[slot=icon]:last:not-nth-2:*:size-4",
		// Avatar
		"*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6 *:data-[slot=avatar]:[--avatar-radius:var(--radius)] *:data-[slot=avatar]:[--ring-opacity:10%]",
		// Hover
		"data-hover:bg-zinc-950/5 data-[slot=icon]:*:data-hover:fill-zinc-950",
		// Active
		"data-active:bg-zinc-950/5 data-[slot=icon]:*:data-active:fill-zinc-950",
		// Dark mode
		"dark:text-white dark:data-[slot=icon]:*:fill-zinc-400",
		"dark:data-hover:bg-white/5 dark:data-[slot=icon]:*:data-hover:fill-white",
		"dark:data-active:bg-white/5 dark:data-[slot=icon]:*:data-active:fill-white"
	);

	return (
		<span className={clsx(className, "relative")}>
			{current && (
				<motion.span
					className="absolute inset-x-2 -bottom-2.5 h-0.5 rounded-full bg-zinc-950 dark:bg-white"
					layoutId="current-indicator"
				/>
			)}
			{(() => {
				if ("to" in props) {
					return (
						<Link
							{...props}
							className={classes}
							data-current={current ? "true" : undefined}
							ref={ref as React.Ref<HTMLAnchorElement>}
						>
							<TouchTarget>{children}</TouchTarget>
						</Link>
					);
				}

				if ("href" in props) {
					return (
						<a
							{...props}
							className={classes}
							data-current={current ? "true" : undefined}
							ref={ref as React.Ref<HTMLAnchorElement>}
						>
							<TouchTarget>{children}</TouchTarget>
						</a>
					);
				}

				return (
					<HeadlessButton
						{...(props as Omit<HeadlessButtonProps, "className" | "ref">)}
						className={clsx("cursor-default", classes)}
						data-current={current ? "true" : undefined}
						ref={ref as React.Ref<HTMLButtonElement>}
					>
						<TouchTarget>{children}</TouchTarget>
					</HeadlessButton>
				);
			})()}
		</span>
	);
};

export function NavbarLabel({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"span">>) {
	return <span {...props} className={clsx(className, "truncate")} />;
}
