"use client";

import {
	Description as HeadlessDescription,
	type DescriptionProps as HeadlessDescriptionProps,
	Label as HeadlessLabel,
	type LabelProps as HeadlessLabelProps,
	Menu as HeadlessMenu,
	MenuButton as HeadlessMenuButton,
	type MenuButtonProps as HeadlessMenuButtonProps,
	MenuHeading as HeadlessMenuHeading,
	type MenuHeadingProps as HeadlessMenuHeadingProps,
	MenuItem as HeadlessMenuItem,
	type MenuItemProps as HeadlessMenuItemProps,
	MenuItems as HeadlessMenuItems,
	type MenuItemsProps as HeadlessMenuItemsProps,
	type MenuProps as HeadlessMenuProps,
	MenuSection as HeadlessMenuSection,
	type MenuSectionProps as HeadlessMenuSectionProps,
	MenuSeparator as HeadlessMenuSeparator,
	type MenuSeparatorProps as HeadlessMenuSeparatorProps,
	Transition as HeadlessTransition,
} from "@headlessui/react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import type React from "react";
import { Button } from "./button";

export function Dropdown(props: HeadlessMenuProps) {
	return <HeadlessMenu {...props} />;
}

export function DropdownButton<T extends React.ElementType = typeof Button>({
	as = Button,
	...props
}: { className?: string } & Omit<HeadlessMenuButtonProps<T>, "className">) {
	return <HeadlessMenuButton as={as} {...props} />;
}

export function DropdownMenu({
	anchor = "bottom",
	className,
	...props
}: { className?: string } & Omit<HeadlessMenuItemsProps, "className">) {
	return (
		<HeadlessTransition leave="duration-100 ease-in" leaveTo="opacity-0">
			<HeadlessMenuItems
				{...props}
				anchor={anchor}
				className={clsx(
					className,
					// Anchor positioning
					"[--anchor-gap:--spacing(2)] [--anchor-padding:--spacing(1)] data-[anchor~=end]:[--anchor-offset:6px] data-[anchor~=start]:[--anchor-offset:-6px] sm:data-[anchor~=end]:[--anchor-offset:4px] sm:data-[anchor~=start]:[--anchor-offset:-4px]",
					// Base styles
					"isolate w-max rounded-xl p-1",
					// Invisible border that is only visible in `forced-colors` mode for accessibility purposes
					"outline-1 outline-transparent focus:outline-none",
					// Handle scrolling when menu won't fit in viewport
					"overflow-y-auto",
					// Popover background
					"bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75",
					// Shadows
					"shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset",
					// Define grid at the menu level if subgrid is supported
					"supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]"
				)}
			/>
		</HeadlessTransition>
	);
}

export function DropdownItem({
	className,
	...props
}: { className?: string } & (
	| (Omit<HeadlessMenuItemProps<typeof Link>, "className"> & {
			href?: never;
	  })
	| (Omit<HeadlessMenuItemProps<"a">, "className"> & {
			href: string;
			to?: never;
	  })
	| Omit<HeadlessMenuItemProps<"button">, "className">
)) {
	const classes = clsx(
		className,
		// Base styles
		"group cursor-default rounded-lg px-3.5 py-2.5 focus:outline-none sm:px-3 sm:py-1.5",
		// Text styles
		"text-left text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]",
		// Focus
		"data-focus:bg-blue-500 data-focus:text-white",
		// Disabled state
		"data-disabled:opacity-50",
		// Forced colors mode
		"forced-color-adjust-none forced-colors:data-focus:bg-[Highlight] forced-colors:data-focus:text-[HighlightText] forced-colors:*:data-[slot=icon]:data-focus:text-[HighlightText]",
		// Use subgrid when available but fallback to an explicit grid layout if not
		"col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] items-center supports-[grid-template-columns:subgrid]:grid-cols-subgrid",
		// Icons
		"*:data-[slot=icon]:col-start-1 *:data-[slot=icon]:row-start-1 *:data-[slot=icon]:mr-2.5 *:data-[slot=icon]:-ml-0.5 *:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:mr-2 *:data-[slot=icon]:sm:size-4",
		"*:data-[slot=icon]:data-focus:text-white *:data-[slot=icon]:text-zinc-500 *:data-[slot=icon]:data-focus:dark:text-white *:data-[slot=icon]:dark:text-zinc-400",
		// Avatar
		"*:data-[slot=avatar]:mr-2.5 *:data-[slot=avatar]:-ml-1 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:mr-2 sm:*:data-[slot=avatar]:size-5"
	);

	if ("to" in props) {
		return <HeadlessMenuItem as={Link} {...props} className={classes} />;
	}

	if ("href" in props) {
		return <HeadlessMenuItem as="a" {...props} className={classes} />;
	}

	return (
		<HeadlessMenuItem
			as="button"
			type="button"
			{...props}
			className={classes}
		/>
	);
}

export function DropdownHeader({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	return (
		<div
			{...props}
			className={clsx(className, "col-span-5 px-3.5 pt-2.5 pb-1 sm:px-3")}
		/>
	);
}

export function DropdownSection({
	className,
	...props
}: { className?: string } & Omit<HeadlessMenuSectionProps, "className">) {
	return (
		<HeadlessMenuSection
			{...props}
			className={clsx(
				className,
				// Define grid at the section level instead of the item level if subgrid is supported
				"col-span-full supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]"
			)}
		/>
	);
}

export function DropdownHeading({
	className,
	...props
}: { className?: string } & Omit<HeadlessMenuHeadingProps, "className">) {
	return (
		<HeadlessMenuHeading
			{...props}
			className={clsx(
				className,
				"col-span-full grid grid-cols-[1fr_auto] gap-x-12 px-3.5 pt-2 pb-1 font-medium text-sm/5 text-zinc-500 sm:px-3 sm:text-xs/5 dark:text-zinc-400"
			)}
		/>
	);
}

export function DropdownDivider({
	className,
	...props
}: { className?: string } & Omit<HeadlessMenuSeparatorProps, "className">) {
	return (
		<HeadlessMenuSeparator
			{...props}
			className={clsx(
				className,
				"col-span-full mx-3.5 my-1 h-px border-0 bg-zinc-950/5 sm:mx-3 dark:bg-white/10 forced-colors:bg-[CanvasText]"
			)}
		/>
	);
}

export function DropdownLabel({
	className,
	...props
}: { className?: string } & Omit<HeadlessLabelProps, "className">) {
	return (
		<HeadlessLabel
			data-slot="label"
			{...props}
			className={clsx(className, "col-start-2 row-start-1")}
		/>
	);
}

export function DropdownDescription({
	className,
	...props
}: { className?: string } & Omit<HeadlessDescriptionProps, "className">) {
	return (
		<HeadlessDescription
			data-slot="description"
			{...props}
			className={clsx(
				className,
				"col-span-2 col-start-2 row-start-2 text-sm/5 text-zinc-500 group-data-focus:text-white sm:text-xs/5 dark:text-zinc-400 forced-colors:group-data-focus:text-[HighlightText]"
			)}
		/>
	);
}

export function DropdownShortcut({
	keys,
	className,
	...props
}: { keys: string | string[]; className?: string } & Omit<
	HeadlessDescriptionProps<"kbd">,
	"className"
>) {
	const shortcutKeys = Array.isArray(keys) ? keys : keys.split("");
	const seenCharacters = new Map<string, number>();

	return (
		<HeadlessDescription
			as="kbd"
			{...props}
			className={clsx(
				className,
				"col-start-5 row-start-1 flex justify-self-end"
			)}
		>
			{shortcutKeys.map((char, index) => {
				const occurrence = (seenCharacters.get(char) ?? 0) + 1;
				seenCharacters.set(char, occurrence);

				return (
					<kbd
						className={clsx([
							"min-w-[2ch] text-center font-sans text-zinc-400 capitalize group-data-focus:text-white forced-colors:group-data-focus:text-[HighlightText]",
							// Make sure key names that are longer than one character (like "Tab") have extra space
							index > 0 && char.length > 1 && "pl-1",
						])}
						key={`${char}-${occurrence}`}
					>
						{char}
					</kbd>
				);
			})}
		</HeadlessDescription>
	);
}
