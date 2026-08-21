import { Checkbox } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/16/solid";
import { Field, Label } from "@/components/ui/fieldset";
import { formatCount } from "@/format";

/** "1 bot account hidden" / "2 bot accounts hidden". */
export const describeHiddenBots = (hiddenBotCount: number): string =>
	`${formatCount(hiddenBotCount, "bot account", "bot accounts")} hidden`;

export function ShowBotsField({
	onChange,
	showBots,
}: Readonly<{
	onChange: (showBots: boolean) => void;
	showBots: boolean;
}>) {
	return (
		<Field className="flex items-center gap-2">
			<Checkbox
				checked={showBots}
				className="group flex size-5 items-center justify-center rounded border border-zinc-950/15 bg-white data-checked:border-zinc-900 data-checked:bg-zinc-900 data-focus:outline-2 data-focus:outline-blue-500 data-focus:outline-offset-2 sm:size-4 dark:border-white/15 dark:bg-white/10 dark:data-checked:border-zinc-100 dark:data-checked:bg-zinc-100"
				onChange={onChange}
			>
				<CheckIcon className="size-3.5 text-white opacity-0 group-data-checked:opacity-100 dark:text-zinc-900" />
			</Checkbox>
			<Label className="text-sm">Show bots</Label>
		</Field>
	);
}
