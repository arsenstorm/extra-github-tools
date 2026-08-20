import clsx from "clsx";
import { Description, Field, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { CONFIRMATION_REQUIRED_REPOSITORY_COUNT } from "./list-types";

export const requiresRepositoryConfirmation = (
	repositoryCount: number
): boolean => repositoryCount >= CONFIRMATION_REQUIRED_REPOSITORY_COUNT;

/** "Type <account> to confirm" guard shown for large bulk runs. */
export function ConfirmationField({
	account,
	className,
	disabled,
	onChange,
	runNoun,
	value,
}: Readonly<{
	account: string;
	className?: string;
	disabled: boolean;
	onChange: (value: string) => void;
	runNoun: string;
	value: string;
}>) {
	return (
		<Field className={clsx(className)}>
			<Label>Type {account} to confirm</Label>
			<Input
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				value={value}
			/>
			<Description>
				This confirmation is required for {runNoun} of{" "}
				{CONFIRMATION_REQUIRED_REPOSITORY_COUNT} or more repositories.
			</Description>
		</Field>
	);
}
