import { ArrowRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Fieldset, Label } from "@/components/ui/fieldset";
import { Listbox, ListboxLabel, ListboxOption } from "@/components/ui/listbox";
import { Text } from "@/components/ui/text";
import type { GitHubAccount } from "@/github";

export function AccountTransferPanel({
	accounts,
	from,
	isLoading,
	onReset,
	onSelectFrom,
	onSelectTo,
	to,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	from?: string;
	isLoading: boolean;
	onReset: () => void;
	onSelectFrom: (accountHandle: string) => void;
	onSelectTo: (accountHandle: string) => void;
	to?: string;
}>) {
	const destinationAccounts =
		accounts?.filter((account) => account.handle !== from) ?? null;

	return (
		<section className="rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
				<Fieldset className="flex-1">
					<div
						className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start"
						data-slot="control"
					>
						<AccountField
							accounts={accounts}
							disabled={isLoading}
							label="Repositories to transfer from"
							onSelect={onSelectFrom}
							placeholder="Choose source"
							value={from}
						/>
						<div aria-hidden="true" className="hidden pt-11 sm:block">
							<ArrowRight className="size-4 text-zinc-400" />
						</div>
						<AccountField
							accounts={destinationAccounts}
							disabled={isLoading}
							label="Repositories to transfer to"
							onSelect={onSelectTo}
							placeholder="Choose destination"
							value={to}
						/>
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
			{from && to && from === to ? (
				<Text className="mt-4 text-red-600 dark:text-red-500">
					Choose different source and destination accounts.
				</Text>
			) : null}
		</section>
	);
}

function AccountField({
	accounts,
	disabled,
	label,
	onSelect,
	placeholder,
	value,
}: Readonly<{
	accounts: GitHubAccount[] | null;
	disabled: boolean;
	label: string;
	onSelect: (accountHandle: string) => void;
	placeholder: string;
	value?: string;
}>) {
	return (
		<Field>
			<Label>{label}</Label>
			<Listbox
				aria-label={label}
				className="mt-2"
				disabled={disabled || !accounts || accounts.length === 0}
				onChange={onSelect}
				placeholder={placeholder}
				value={value ?? ""}
			>
				{accounts?.map((account) => (
					<ListboxOption key={account.handle} value={account.handle}>
						<img
							alt=""
							className="rounded-full"
							data-slot="avatar"
							height={24}
							src={account.avatar}
							width={24}
						/>
						<ListboxLabel>{account.handle}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	);
}
