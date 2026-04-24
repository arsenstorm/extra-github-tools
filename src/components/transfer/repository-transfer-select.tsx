export function RepositoryTransferSelect<T extends string>({
	ariaLabel,
	className = "mt-2",
	disabled,
	onChange,
	options,
	value,
}: Readonly<{
	ariaLabel: string;
	className?: string;
	disabled: boolean;
	onChange: (value: T) => void;
	options: ReadonlyArray<{
		label: string;
		value: T;
	}>;
	value: T;
}>) {
	return (
		<span
			className={`relative block w-full before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm has-data-disabled:opacity-50 has-data-disabled:before:bg-zinc-950/5 has-data-disabled:before:shadow-none dark:before:hidden ${className}`}
			data-slot="control"
		>
			<select
				aria-label={ariaLabel}
				className="dark:scheme-dark relative block min-h-11 w-full appearance-none rounded-lg border border-zinc-950/10 bg-transparent py-[calc(--spacing(2.5)-1px)] pr-10 pl-[calc(--spacing(3.5)-1px)] text-base/6 text-zinc-950 focus:outline-hidden data-disabled:border-zinc-950/20 sm:min-h-9 sm:py-[calc(--spacing(1.5)-1px)] sm:pl-[calc(--spacing(3)-1px)] sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5"
				disabled={disabled}
				onChange={(event) => onChange(event.target.value as T)}
				value={value}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
				<svg
					aria-hidden="true"
					className="size-5 stroke-zinc-500 sm:size-4 dark:stroke-zinc-400"
					fill="none"
					viewBox="0 0 16 16"
				>
					<path
						d="M5.75 10.75L8 13L10.25 10.75"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
					/>
					<path
						d="M10.25 5.25L8 3L5.75 5.25"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
					/>
				</svg>
			</span>
		</span>
	);
}
