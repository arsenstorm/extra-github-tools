import { Listbox, ListboxLabel, ListboxOption } from "@/components/ui/listbox";
import type { GitHubAccount } from "@/github/types";

export function AccountListbox({
	accounts,
	className,
	disabled,
	label,
	onPreload,
	onSelect,
	placeholder,
	value,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	className?: string;
	disabled: boolean;
	label: string;
	/** Called when an option is hovered or focused, so its data can be preloaded. */
	onPreload?: (accountHandle: string) => void;
	onSelect: (accountHandle: string) => void;
	placeholder: string;
	value?: string;
}>) {
	return (
		<Listbox
			aria-label={label}
			className={className}
			disabled={disabled || !accounts || accounts.length === 0}
			onChange={(accountHandle: string | null) => {
				if (accountHandle) {
					onSelect(accountHandle);
				}
			}}
			placeholder={placeholder}
			value={value ?? null}
		>
			{accounts?.map((account) => (
				<ListboxOption
					key={account.handle}
					onFocus={() => onPreload?.(account.handle)}
					onMouseEnter={() => onPreload?.(account.handle)}
					value={account.handle}
				>
					<img
						alt=""
						className="rounded-md"
						data-slot="avatar"
						height={24}
						src={account.avatar}
						width={24}
					/>
					<ListboxLabel>{account.handle}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	);
}
