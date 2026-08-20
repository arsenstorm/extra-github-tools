import { AccountListbox } from "@/components/repositories/account-listbox";
import { RepositoryListToolbar } from "@/components/repositories/list-toolbar";
import type { RepositorySort } from "@/components/repositories/list-types";
import type { GitHubAccount } from "@/github/types";

export function ManageToolbar({
	account,
	accounts,
	disabled,
	onChangeSearch,
	onChangeSort,
	onPreloadAccount,
	onSelectAccount,
	search,
	sort,
}: Readonly<{
	account?: string;
	accounts: GitHubAccount[] | null;
	disabled: boolean;
	onChangeSearch?: (value: string) => void;
	onChangeSort?: (value: RepositorySort) => void;
	onPreloadAccount?: (accountHandle: string) => void;
	onSelectAccount: (accountHandle: string) => void;
	search?: string;
	sort?: RepositorySort;
}>) {
	return (
		<RepositoryListToolbar
			disabled={disabled}
			onChangeSearch={onChangeSearch}
			onChangeSort={onChangeSort}
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
