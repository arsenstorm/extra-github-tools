import { ArrowRight } from "lucide-react";
import { AccountListbox } from "@/components/repositories/account-listbox";
import { RepositoryListToolbar } from "@/components/repositories/list-toolbar";
import type { RepositorySort } from "@/components/repositories/list-types";
import type { GitHubAccount } from "@/github/types";

export function TransferToolbar({
	accounts,
	className,
	disabled,
	from,
	onChangeSearch,
	onChangeSort,
	onPreloadSource,
	onSelectFrom,
	onSelectTo,
	ref,
	search,
	sort,
	to,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	className?: string;
	disabled: boolean;
	from?: string;
	onChangeSearch?: (value: string) => void;
	onChangeSort?: (value: RepositorySort) => void;
	onPreloadSource?: (accountHandle: string) => void;
	onSelectFrom: (accountHandle: string) => void;
	onSelectTo: (accountHandle: string) => void;
	ref?: React.Ref<HTMLDivElement>;
	search?: string;
	sort?: RepositorySort;
	to?: string;
}>) {
	const destinationAccounts =
		accounts?.filter((account) => account.handle !== from) ?? null;

	return (
		<RepositoryListToolbar
			className={className}
			disabled={disabled}
			onChangeSearch={onChangeSearch}
			onChangeSort={onChangeSort}
			ref={ref}
			search={search}
			sort={sort}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<AccountListbox
					accounts={accounts}
					className="sm:w-48 xl:w-60"
					disabled={false}
					label="Repositories to transfer from"
					onPreload={onPreloadSource}
					onSelect={onSelectFrom}
					placeholder="Select a source"
					value={from}
				/>
				<ArrowRight
					aria-hidden="true"
					className="hidden size-4 shrink-0 text-zinc-400 sm:block"
				/>
				<AccountListbox
					accounts={destinationAccounts}
					className="sm:w-48 xl:w-60"
					disabled={false}
					label="Repositories to transfer to"
					onSelect={onSelectTo}
					placeholder="Select a destination"
					value={to}
				/>
			</div>
		</RepositoryListToolbar>
	);
}
