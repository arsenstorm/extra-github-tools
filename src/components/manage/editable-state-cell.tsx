import { CheckIcon, ChevronDownIcon } from "@heroicons/react/16/solid";
import { stopEventPropagation } from "@/components/repositories/selectable-row";
import { Button } from "@/components/ui/button";
import {
	Dropdown,
	DropdownButton,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from "@/components/ui/dropdown";
import { TableCell } from "@/components/ui/table";

const STATE_CELL_BUTTON_CLASS_NAME =
	"group -mx-1.5 gap-x-1.5 px-1.5! py-1! font-normal!";
const STATE_CELL_CHEVRON_CLASS_NAME =
	"size-3! text-zinc-400! group-data-hover:text-zinc-600! group-data-open:text-zinc-600! dark:group-data-hover:text-zinc-200! dark:group-data-open:text-zinc-200!";

export interface StateOption<T extends string> {
	label: string;
	value: T;
}

/** A table cell whose text opens a menu of alternative states for the repository. */
export function EditableStateCell<T extends string>({
	ariaLabel,
	disabled,
	interactive,
	label,
	onSelect,
	options,
	value,
}: Readonly<{
	ariaLabel: string;
	disabled: boolean;
	/** Whether to mount the real menu; false renders an identical-looking button. */
	interactive: boolean;
	/** The current state as shown in the cell. */
	label: string;
	onSelect: (value: T) => void;
	options: readonly StateOption<T>[];
	value: T | null;
}>) {
	const content = (
		<>
			<span className="text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">
				{label}
			</span>
			<ChevronDownIcon className={STATE_CELL_CHEVRON_CLASS_NAME} />
		</>
	);

	return (
		<TableCell onClick={stopEventPropagation}>
			{interactive ? (
				<Dropdown>
					<DropdownButton
						aria-label={ariaLabel}
						className={STATE_CELL_BUTTON_CLASS_NAME}
						disabled={disabled}
						onClick={stopEventPropagation}
						plain
					>
						{content}
					</DropdownButton>
					<StateMenu onSelect={onSelect} options={options} value={value} />
				</Dropdown>
			) : (
				<Button
					aria-label={ariaLabel}
					className={STATE_CELL_BUTTON_CLASS_NAME}
					disabled={disabled}
					onClick={stopEventPropagation}
					plain
					type="button"
				>
					{content}
				</Button>
			)}
		</TableCell>
	);
}

function StateMenu<T extends string>({
	onSelect,
	options,
	value,
}: Readonly<{
	onSelect: (value: T) => void;
	options: readonly StateOption<T>[];
	value: T | null;
}>) {
	return (
		<DropdownMenu anchor="bottom start">
			{options.map((option) => (
				<DropdownItem
					key={option.value}
					onClick={() => {
						if (option.value !== value) {
							onSelect(option.value);
						}
					}}
				>
					{option.value === value ? <CheckIcon /> : null}
					<DropdownLabel>{option.label}</DropdownLabel>
				</DropdownItem>
			))}
		</DropdownMenu>
	);
}
