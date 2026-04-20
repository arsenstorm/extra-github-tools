"use client";

import {
	Description as HeadlessDescription,
	type DescriptionProps as HeadlessDescriptionProps,
	Field as HeadlessField,
	type FieldProps as HeadlessFieldProps,
	Fieldset as HeadlessFieldset,
	type FieldsetProps as HeadlessFieldsetProps,
	Label as HeadlessLabel,
	type LabelProps as HeadlessLabelProps,
	Legend as HeadlessLegend,
	type LegendProps as HeadlessLegendProps,
} from "@headlessui/react";
import clsx from "clsx";
import type React from "react";

export function Fieldset({
	className,
	...props
}: { className?: string } & Omit<HeadlessFieldsetProps, "className">) {
	return (
		<HeadlessFieldset
			{...props}
			className={clsx(
				className,
				"*:data-[slot=text]:mt-1 [&>*+[data-slot=control]]:mt-6"
			)}
		/>
	);
}

export function Legend({
	className,
	...props
}: { className?: string } & Omit<HeadlessLegendProps, "className">) {
	return (
		<HeadlessLegend
			data-slot="legend"
			{...props}
			className={clsx(
				className,
				"font-semibold text-base/6 text-zinc-950 data-disabled:opacity-50 sm:text-sm/6 dark:text-white"
			)}
		/>
	);
}

export function FieldGroup({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	return (
		<div
			data-slot="control"
			{...props}
			className={clsx(className, "space-y-8")}
		/>
	);
}

export function Field({
	className,
	...props
}: { className?: string } & Omit<HeadlessFieldProps, "className">) {
	return (
		<HeadlessField
			{...props}
			className={clsx(
				className,
				"[&>[data-slot=label]+[data-slot=control]]:mt-3",
				"[&>[data-slot=label]+[data-slot=description]]:mt-1",
				"[&>[data-slot=description]+[data-slot=control]]:mt-3",
				"[&>[data-slot=control]+[data-slot=description]]:mt-3",
				"[&>[data-slot=control]+[data-slot=error]]:mt-3",
				"*:data-[slot=label]:font-medium"
			)}
		/>
	);
}

export function Label({
	className,
	...props
}: { className?: string } & Omit<HeadlessLabelProps, "className">) {
	return (
		<HeadlessLabel
			data-slot="label"
			{...props}
			className={clsx(
				className,
				"select-none text-base/6 text-zinc-950 data-disabled:opacity-50 sm:text-sm/6 dark:text-white"
			)}
		/>
	);
}

export function Description({
	className,
	...props
}: { className?: string } & Omit<HeadlessDescriptionProps, "className">) {
	return (
		<HeadlessDescription
			data-slot="description"
			{...props}
			className={clsx(
				className,
				"text-base/6 text-zinc-500 data-disabled:opacity-50 sm:text-sm/6 dark:text-zinc-400"
			)}
		/>
	);
}

export function ErrorMessage({
	className,
	...props
}: { className?: string } & Omit<HeadlessDescriptionProps, "className">) {
	return (
		<HeadlessDescription
			data-slot="error"
			{...props}
			className={clsx(
				className,
				"text-base/6 text-red-600 data-disabled:opacity-50 sm:text-sm/6 dark:text-red-500"
			)}
		/>
	);
}
