"use client";

import {
	Button as HeadlessButton,
	type ButtonProps as HeadlessButtonProps,
} from "@headlessui/react";
import clsx from "clsx";
import type React from "react";
import { TouchTarget } from "./button";

interface AvatarProps {
	alt?: string;
	className?: string;
	initials?: string;
	square?: boolean;
	src?: string | null;
}

export function Avatar({
	src = null,
	square = false,
	initials,
	alt = "",
	className,
	...props
}: AvatarProps & React.ComponentPropsWithoutRef<"span">) {
	return (
		<span
			data-slot="avatar"
			{...props}
			className={clsx(
				className,
				// Basic layout
				"inline-grid shrink-0 align-middle [--avatar-radius:20%] [--ring-opacity:20%] *:col-start-1 *:row-start-1",
				"outline-2 outline-black/(--ring-opacity) -outline-offset-1 dark:outline-white/(--ring-opacity)",
				// Add the correct border radius
				square
					? "rounded-(--avatar-radius) *:rounded-(--avatar-radius)"
					: "rounded-full *:rounded-full"
			)}
		>
			{initials && (
				<svg
					aria-hidden={alt ? undefined : "true"}
					className="select-none fill-current font-medium text-[48px] uppercase"
					viewBox="0 0 100 100"
				>
					<title>{alt}</title>
					<text
						alignmentBaseline="middle"
						dominantBaseline="middle"
						dy=".125em"
						textAnchor="middle"
						x="50%"
						y="50%"
					>
						{initials}
					</text>
				</svg>
			)}
			{src && <img alt={alt} height={512} src={src} width={512} />}
		</span>
	);
}

type AvatarButtonProps = AvatarProps & {
	ref?: React.Ref<HTMLButtonElement>;
} & Omit<HeadlessButtonProps, "className" | "ref">;

export const AvatarButton = function AvatarButton({
	src,
	square = false,
	initials,
	alt,
	className,
	ref,
	...props
}: AvatarButtonProps) {
	const classes = clsx(
		className,
		square ? "rounded-[20%]" : "rounded-full",
		"relative focus:outline-none data-focus:outline data-focus:outline-2 data-focus:outline-blue-500 data-focus:outline-offset-2"
	);

	return (
		<HeadlessButton {...props} className={classes} ref={ref}>
			<TouchTarget>
				<Avatar alt={alt} initials={initials} square={square} src={src} />
			</TouchTarget>
		</HeadlessButton>
	);
};
