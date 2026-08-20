import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { Input, InputGroup } from "@/components/ui/input";
import { REPOSITORY_SORT_OPTIONS, type RepositorySort } from "./list-types";
import { RepositorySelect } from "./select";

const NOOP = (): void => {
	// Search and sort are inert until a repository list is loaded.
};

export function RepositoryListToolbar({
	children,
	disabled,
	onChangeSearch = NOOP,
	onChangeSort = NOOP,
	search = "",
	sort = "default",
}: Readonly<{
	children: React.ReactNode;
	disabled: boolean;
	onChangeSearch?: (value: string) => void;
	onChangeSort?: (value: RepositorySort) => void;
	search?: string;
	sort?: RepositorySort;
}>) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 flex-1">{children}</div>
			<div className="grid gap-3 sm:min-w-lg sm:grid-cols-[minmax(0,1fr)_12rem]">
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
