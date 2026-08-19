"use client";

import {
	DialogBackdrop,
	DialogPanel,
	Dialog as HeadlessDialog,
	DialogTitle as HeadlessDialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import type React from "react";
import { Text } from "./text";

const PANEL_SIZES = {
	lg: "sm:max-w-lg",
	md: "sm:max-w-md",
	xl: "sm:max-w-xl",
} as const;

export function Dialog({
	children,
	onClose,
	open,
	size = "lg",
}: Readonly<{
	children: React.ReactNode;
	onClose: () => void;
	open: boolean;
	size?: "lg" | "md" | "xl";
}>) {
	return (
		<HeadlessDialog className="relative z-50" onClose={onClose} open={open}>
			<DialogBackdrop
				className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition duration-100 data-closed:opacity-0 data-enter:ease-out data-leave:ease-in dark:bg-zinc-950/60"
				transition
			/>
			<div className="fixed inset-0 w-screen overflow-y-auto p-4 sm:p-6">
				<div className="grid min-h-full grid-rows-[1fr_auto] justify-items-center sm:grid-rows-[1fr_auto_3fr]">
					<DialogPanel
						className={clsx(
							PANEL_SIZES[size],
							"row-start-2 flex max-h-[calc(100dvh-4rem)] w-full flex-col rounded-lg border border-zinc-950/10 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-zinc-900",
							"transition duration-100 data-closed:translate-y-4 data-closed:opacity-0 data-enter:ease-out data-leave:ease-in sm:data-closed:translate-y-0 sm:data-closed:scale-95"
						)}
						transition
					>
						{children}
					</DialogPanel>
				</div>
			</div>
		</HeadlessDialog>
	);
}

export function DialogTitle({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"h2">>) {
	return (
		<HeadlessDialogTitle
			{...props}
			className={clsx(
				className,
				"text-balance font-semibold text-lg/6 text-zinc-950 sm:text-base/6 dark:text-white"
			)}
		/>
	);
}

export function DialogDescription({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"p">>) {
	return <Text {...props} className={clsx(className, "mt-2 text-pretty")} />;
}

export function DialogBody({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	return (
		<div
			{...props}
			className={clsx(className, "mt-6 flex-1 overflow-y-auto")}
			data-slot="dialog-body"
		/>
	);
}

export function DialogActions({
	className,
	...props
}: Readonly<React.ComponentPropsWithoutRef<"div">>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				"mt-6 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:flex-row sm:*:w-auto"
			)}
			data-slot="dialog-actions"
		/>
	);
}
