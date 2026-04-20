"use client";

import {
	Textarea as HeadlessTextarea,
	type TextareaProps as HeadlessTextareaProps,
} from "@headlessui/react";
import { clsx } from "clsx";
import type React from "react";

export const Textarea = function Textarea({
	className,
	resizable = true,
	ref,
	...props
}: {
	className?: string;
	ref?: React.Ref<HTMLTextAreaElement>;
	resizable?: boolean;
} & Omit<HeadlessTextareaProps, "className" | "ref">) {
	return (
		<span
			className={clsx([
				className,
				// Basic layout
				"relative block w-full",
				// Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
				"before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow",
				// Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
				"dark:before:hidden",
				// Focus ring
				"after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:after:focus-within:ring-2 sm:after:focus-within:ring-blue-500",
				// Disabled state
				"has-data-disabled:opacity-50 before:has-data-disabled:bg-zinc-950/5 before:has-data-disabled:shadow-none",
			])}
			data-slot="control"
		>
			<HeadlessTextarea
				ref={ref}
				{...props}
				className={clsx([
					// Basic layout
					"relative block h-full w-full appearance-none rounded-lg px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]",
					// Typography
					"text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white",
					// Border
					"border border-zinc-950/10 data-hover:border-zinc-950/20 dark:border-white/10 dark:data-hover:border-white/20",
					// Background color
					"bg-transparent dark:bg-white/5",
					// Hide default focus styles
					"focus:outline-none",
					// Invalid state
					"data-invalid:data-hover:border-red-500 data-invalid:border-red-500 data-invalid:data-hover:dark:border-red-600 data-invalid:dark:border-red-600",
					// Disabled state
					"disabled:border-zinc-950/20 disabled:dark:border-white/15 disabled:dark:bg-white/2.5 dark:data-hover:disabled:border-white/15",
					// Resizable
					resizable ? "resize-y" : "resize-none",
				])}
			/>
		</span>
	);
};
