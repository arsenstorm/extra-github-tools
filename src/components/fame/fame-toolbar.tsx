import { ArrowLeft } from "lucide-react";
import { AccountListbox } from "@/components/repositories/account-listbox";
import { RepositoryListToolbar } from "@/components/repositories/list-toolbar";
import type { RepositorySort } from "@/components/repositories/list-types";
import { Button } from "@/components/ui/button";
import type { GitHubAccount } from "@/github/types";

function FameAccountListbox({
	accounts,
	onPreloadAccount,
	onSelectAccount,
	org,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	onPreloadAccount?: (accountHandle: string) => void;
	onSelectAccount: (accountHandle: string) => void;
	org?: string;
}>) {
	return (
		<AccountListbox
			accounts={accounts}
			className="sm:max-w-xs"
			disabled={false}
			label="Account to analyze"
			onPreload={onPreloadAccount}
			onSelect={onSelectAccount}
			placeholder="Select an organization"
			value={org}
		/>
	);
}

/** The account picker with the repository list's search and sort controls. */
export function FameToolbar({
	accounts,
	className,
	disabled,
	onChangeSearch,
	onChangeSort,
	onPreloadAccount,
	onSelectAccount,
	org,
	ref,
	search,
	sort,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	className?: string;
	disabled: boolean;
	onChangeSearch?: (value: string) => void;
	onChangeSort?: (value: RepositorySort) => void;
	onPreloadAccount?: (accountHandle: string) => void;
	onSelectAccount: (accountHandle: string) => void;
	org?: string;
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
			<FameAccountListbox
				accounts={accounts}
				onPreloadAccount={onPreloadAccount}
				onSelectAccount={onSelectAccount}
				org={org}
			/>
		</RepositoryListToolbar>
	);
}

/** The account picker shown above an analysis, with a way back to the list. */
export function FameAnalysisToolbar({
	accounts,
	onClearRepository,
	onPreloadAccount,
	onSelectAccount,
	org,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	onClearRepository: () => void;
	onPreloadAccount?: (accountHandle: string) => void;
	onSelectAccount: (accountHandle: string) => void;
	org: string;
}>) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 flex-1">
				<FameAccountListbox
					accounts={accounts}
					onPreloadAccount={onPreloadAccount}
					onSelectAccount={onSelectAccount}
					org={org}
				/>
			</div>
			<Button onClick={onClearRepository} outline>
				<ArrowLeft data-slot="icon" />
				All repositories
			</Button>
		</div>
	);
}
