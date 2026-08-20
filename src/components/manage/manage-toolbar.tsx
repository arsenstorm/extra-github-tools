import { AccountListbox } from "@/components/repositories/account-listbox";
import { RepositoryListToolbar } from "@/components/repositories/list-toolbar";
import type { RepositorySort } from "@/components/repositories/list-types";
import type { GitHubAccount } from "@/github/types";

export function ManageToolbar({
	account,
	accounts,
	className,
	disabled,
	onChangeSearch,
	onChangeSort,
	onPreloadAccount,
	onSelectAccount,
	ref,
	search,
	sort,
}: Readonly<{
	account?: string;
	accounts: GitHubAccount[] | null;
	className?: string;
	disabled: boolean;
	onChangeSearch?: (value: string) => void;
	onChangeSort?: (value: RepositorySort) => void;
	onPreloadAccount?: (accountHandle: string) => void;
	onSelectAccount: (accountHandle: string) => void;
	ref?: React.Ref<HTMLDivElement>;
	search?: string;
	sort?: RepositorySort;
}>) {
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
			<AccountListbox
				accounts={accounts}
				className="sm:max-w-xs"
				disabled={false}
				label="Account to manage"
				onPreload={onPreloadAccount}
				onSelect={onSelectAccount}
				placeholder="Select an organization"
				value={account}
			/>
		</RepositoryListToolbar>
	);
}
