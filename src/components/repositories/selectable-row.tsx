import { Checkbox } from "@headlessui/react";
import { type KeyboardEvent, type MouseEvent, useRef } from "react";
import { TableCell, TableHeader, TableRow } from "@/components/ui/table";

export const stopEventPropagation = (event: MouseEvent): void =>
	event.stopPropagation();

/**
 * Double-clicks and shift-clicks start a native text selection on nearby
 * text; cancelling the mousedown prevents that without affecting the click.
 */
const preventSelectionOnMultiClick = (event: MouseEvent): void => {
	if (event.detail > 1 || event.shiftKey) {
		event.preventDefault();
	}
};

export const SELECT_COLUMN_CLASS_NAME = "w-10 pr-2! pl-4!";

export interface VisibleSelection {
	/** Every row on the page is selected. */
	all: boolean;
	/** At least one, but not every, row on the page is selected. */
	some: boolean;
}

export const getVisibleSelection = (
	visibleNames: string[],
	selectedNames: Set<string>
): VisibleSelection => {
	const selectedCount = visibleNames.filter((name) =>
		selectedNames.has(name)
	).length;

	return {
		all: visibleNames.length > 0 && selectedCount === visibleNames.length,
		some: selectedCount > 0 && selectedCount < visibleNames.length,
	};
};

function SelectionCheckbox({
	ariaLabel,
	checked,
	disabled,
	indeterminate = false,
	onChange,
	onPointerDown,
}: Readonly<{
	ariaLabel: string;
	checked: boolean;
	disabled: boolean;
	indeterminate?: boolean;
	onChange: () => void;
	onPointerDown?: (event: React.PointerEvent) => void;
}>) {
	return (
		<Checkbox
			aria-label={ariaLabel}
			checked={checked}
			className="group block size-5 rounded border border-zinc-950/15 bg-white data-checked:border-zinc-500 data-indeterminate:border-zinc-500 data-checked:bg-zinc-500 data-indeterminate:bg-zinc-500 data-disabled:opacity-50 sm:size-4 dark:border-white/15 dark:bg-white/10 dark:data-checked:border-zinc-400 dark:data-indeterminate:border-zinc-400 dark:data-checked:bg-zinc-400 dark:data-indeterminate:bg-zinc-400"
			disabled={disabled}
			indeterminate={indeterminate}
			onChange={onChange}
			onClick={stopEventPropagation}
			onMouseDown={preventSelectionOnMultiClick}
			onPointerDown={onPointerDown}
		>
			<svg
				aria-hidden="true"
				className="stroke-white opacity-0 group-data-checked:opacity-100 group-data-indeterminate:opacity-100"
				fill="none"
				viewBox="0 0 14 14"
			>
				<path
					className="group-data-indeterminate:hidden"
					d="M3 8L6 11L11 3.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
				/>
				<path
					className="hidden group-data-indeterminate:inline"
					d="M3 7H11"
					strokeLinecap="round"
					strokeWidth={2}
				/>
			</svg>
		</Checkbox>
	);
}

/** Header cell for the select column with a select-all checkbox for the visible rows. */
export function SelectableRowHeader({
	disabled,
	onToggleAll,
	selection,
}: Readonly<{
	disabled: boolean;
	onToggleAll: () => void;
	selection: VisibleSelection;
}>) {
	return (
		<TableHeader className={SELECT_COLUMN_CLASS_NAME}>
			<SelectionCheckbox
				ariaLabel="Select all repositories on this page"
				checked={selection.all}
				disabled={disabled}
				indeterminate={selection.some}
				onChange={onToggleAll}
			/>
		</TableHeader>
	);
}

/**
 * A table row that toggles selection on click, Enter, or Space, with a
 * leading checkbox. Shift-click or shift-Space extends the selection range.
 */
export function SelectableRepositoryRow({
	children,
	disabled,
	isSelected,
	onActivate,
	onToggle,
	repositoryName,
}: Readonly<{
	children: React.ReactNode;
	disabled: boolean;
	isSelected: boolean;
	/** Fires the first time the pointer enters, presses, or focus lands in the row. */
	onActivate?: () => void;
	onToggle: (repositoryName: string, shouldSelectRange?: boolean) => void;
	repositoryName: string;
}>) {
	const checkboxShouldSelectRangeRef = useRef(false);

	const handleRowKeyDown = (
		event: KeyboardEvent<HTMLTableRowElement>
	): void => {
		const isRowTarget = event.target === event.currentTarget;
		const isToggleKey = event.key === "Enter" || event.key === " ";

		if (!(isRowTarget && isToggleKey) || disabled) {
			return;
		}

		event.preventDefault();
		onToggle(repositoryName, event.shiftKey);
	};

	return (
		<TableRow
			aria-selected={isSelected}
			className="cursor-pointer hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:-outline-offset-2 dark:hover:bg-zinc-800"
			onClick={(event) => {
				if (!disabled) {
					onToggle(repositoryName, event.shiftKey);
				}
			}}
			onFocusCapture={onActivate}
			onKeyDown={handleRowKeyDown}
			onMouseDown={preventSelectionOnMultiClick}
			onPointerDownCapture={onActivate}
			onPointerEnter={onActivate}
			tabIndex={0}
		>
			<TableCell className="pr-2! pl-4!">
				<SelectionCheckbox
					ariaLabel={`Select ${repositoryName}`}
					checked={isSelected}
					disabled={disabled}
					onChange={() => {
						onToggle(repositoryName, checkboxShouldSelectRangeRef.current);
						checkboxShouldSelectRangeRef.current = false;
					}}
					onPointerDown={(event) => {
						checkboxShouldSelectRangeRef.current = event.shiftKey;
					}}
				/>
			</TableCell>
			{children}
		</TableRow>
	);
}
