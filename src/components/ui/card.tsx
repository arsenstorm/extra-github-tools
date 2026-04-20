import { clsx } from "clsx";
import type * as React from "react";

const Card = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	ref?: React.RefObject<HTMLDivElement | null>;
}) => (
	<div
		className={clsx(
			"rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
			className
		)}
		ref={ref}
		{...props}
	/>
);
Card.displayName = "Card";

const CardHeader = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	ref?: React.RefObject<HTMLDivElement | null>;
}) => (
	<div
		className={clsx("flex flex-col space-y-1.5 p-6", className)}
		ref={ref}
		{...props}
	/>
);
CardHeader.displayName = "CardHeader";

const CardTitle = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
	ref?: React.RefObject<HTMLParagraphElement | null>;
}) => (
	<h3
		className={clsx(
			"font-semibold text-2xl leading-none tracking-tight",
			className
		)}
		ref={ref}
		{...props}
	/>
);
CardTitle.displayName = "CardTitle";

const CardDescription = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
	ref?: React.RefObject<HTMLParagraphElement | null>;
}) => (
	<p
		className={clsx("text-sm text-zinc-500 dark:text-zinc-400", className)}
		ref={ref}
		{...props}
	/>
);
CardDescription.displayName = "CardDescription";

const CardContent = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	ref?: React.RefObject<HTMLDivElement | null>;
}) => <div className={clsx("p-6 pt-0", className)} ref={ref} {...props} />;
CardContent.displayName = "CardContent";

const CardFooter = ({
	className,
	ref,
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	ref?: React.RefObject<HTMLDivElement | null>;
}) => (
	<div
		className={clsx("flex items-center p-6 pt-0", className)}
		ref={ref}
		{...props}
	/>
);
CardFooter.displayName = "CardFooter";

export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
};
