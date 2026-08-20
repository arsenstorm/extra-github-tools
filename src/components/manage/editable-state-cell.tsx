import clsx from "clsx";
import type { MouseEvent } from "react";
import {
	getRepositoryBadgeClassName,
	getRepositoryBadgeStagedClassName,
} from "@/components/repositories/badge";
import { stopEventPropagation } from "@/components/repositories/selectable-row";
import type { StateBadgeStyle } from "@/components/repositories/state-badges";
import { TableCell } from "@/components/ui/table";

export interface StateOption<T extends string> {
	label: string;
	value: T;
}

/** The option after `value`, wrapping; an unknown value steps to the first option. */
const getNextOption = <T extends string>(
	options: readonly StateOption<T>[],
	value: T | null
): StateOption<T> => {
	const currentIndex = options.findIndex((option) => option.value === value);

	return options[(currentIndex + 1) % options.length];
};

/** A table cell whose state badge cycles to the column's next value on each press. */
export function EditableStateCell<T extends string>({
	ariaLabel,
	badge,
	className,
	disabled,
	isStaged,
	onSelect,
	options,
	value,
}: Readonly<{
	ariaLabel: string;
	/** The effective state (staged if any, else current). */
	badge: StateBadgeStyle;
	/** Usually a fixed width so every value in the column takes the same space. */
	className?: string;
	disabled: boolean;
	isStaged: boolean;
	onSelect: (value: T) => void;
	options: readonly StateOption<T>[];
	value: T | null;
}>) {
	const nextOption = getNextOption(options, value);

	const handleClick = (event: MouseEvent): void => {
		event.stopPropagation();
		onSelect(nextOption.value);
	};

	return (
		<TableCell onClick={stopEventPropagation}>
			<button
				aria-label={`${ariaLabel}: ${badge.label}. Press to change to ${nextOption.label}.`}
				className={clsx(
					getRepositoryBadgeClassName(badge.tone, true),
					isStaged && getRepositoryBadgeStagedClassName(badge.tone),
					className
				)}
				disabled={disabled}
				onClick={handleClick}
				title={`Change to ${nextOption.label}`}
				type="button"
			>
				{badge.label}
			</button>
		</TableCell>
	);
}
