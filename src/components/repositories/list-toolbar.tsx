import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { Input, InputGroup } from "@/components/ui/input";
import { REPOSITORY_SORT_OPTIONS, type RepositorySort } from "./list-types";
import { RepositorySelect } from "./select";

const NOOP = (): void => {
	// Search and sort are inert until a repository list is loaded.
};

export function RepositoryListToolbar({
	children,
	className,
	disabled,
	onChangeSearch = NOOP,
	onChangeSort = NOOP,
	ref,
	search = "",
	sort = "default",
}: Readonly<{
	children: React.ReactNode;
	className?: string;
	disabled: boolean;
	onChangeSearch?: (value: string) => void;
	onChangeSort?: (value: RepositorySort) => void;
	ref?: React.Ref<HTMLDivElement>;
	search?: string;
	sort?: RepositorySort;
}>) {
	return (
		<div
			className={clsx(
				"flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
				className
			)}
			ref={ref}
		>
			<div className="min-w-0 flex-1">{children}</div>
			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] lg:min-w-md xl:min-w-lg">
				<InputGroup>
					<MagnifyingGlassIcon />
					<Input
						aria-label="Search repositories"
						onChange={(event) => onChangeSearch(event.target.value)}
						placeholder="Search repositories"
						type="search"
						value={search}
					/>
				</InputGroup>
				<RepositorySelect<RepositorySort>
					ariaLabel="Sort repositories"
					className="mt-0"
					disabled={disabled}
					onChange={onChangeSort}
					options={REPOSITORY_SORT_OPTIONS}
					value={sort}
				/>
			</div>
		</div>
	);
}
