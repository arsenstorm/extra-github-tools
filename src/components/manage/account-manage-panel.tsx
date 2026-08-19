import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Fieldset, Label } from "@/components/ui/fieldset";
import { Listbox, ListboxLabel, ListboxOption } from "@/components/ui/listbox";
import type { GitHubAccount } from "@/github";

const ACCOUNT_LABEL = "Account to manage";

export function AccountManagePanel({
	account,
	accounts,
	isLoading,
	onReset,
	onSelectAccount,
}: Readonly<{
	account?: string;
	accounts: GitHubAccount[] | null;
	isLoading: boolean;
	onReset: () => void;
	onSelectAccount: (accountHandle: string) => void;
}>) {
	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
				<Fieldset className="flex-1">
					<div className="grid gap-4 sm:max-w-md" data-slot="control">
						<Field>
							<Label>{ACCOUNT_LABEL}</Label>
							<Listbox
								aria-label={ACCOUNT_LABEL}
								className="mt-2"
								disabled={isLoading || !accounts || accounts.length === 0}
								onChange={onSelectAccount}
								placeholder="Choose account"
								value={account ?? ""}
							>
								{accounts?.map((accountOption) => (
									<ListboxOption
										key={accountOption.handle}
										value={accountOption.handle}
									>
										<img
											alt=""
											className="rounded-full"
											data-slot="avatar"
											height={24}
											src={accountOption.avatar}
											width={24}
										/>
										<ListboxLabel>{accountOption.handle}</ListboxLabel>
									</ListboxOption>
								))}
							</Listbox>
						</Field>
					</div>
				</Fieldset>
				<Button
					className="self-start sm:self-end"
					disabled={isLoading}
					onClick={onReset}
					outline
				>
					<RefreshCcw data-slot="icon" />
					Reset
				</Button>
			</div>
		</section>
	);
}
