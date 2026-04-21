"use client";

import { useAppSession } from "@/app-session";
import SignInButton from "@/components/sign-in-button";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export default function PageHeading({
	title = "Extra GitHub Tools",
	description = "Extra tools for GitHub that you didn’t know you needed.",
}: Readonly<{
	readonly title?: string;
	readonly description?: string;
}>): React.ReactNode {
	const { github, session } = useAppSession();
	const showButton = !(session && github?.hasAccessToken);

	return (
		<>
			<div className="flex w-full flex-wrap items-center justify-between gap-4">
				<div className="flex flex-col">
					<Heading>{title}</Heading>
					<Text>{description}</Text>
				</div>
				{showButton && (
					<div className="flex gap-4">
						<SignInButton />
					</div>
				)}
			</div>
			<Divider className="my-6" />
		</>
	);
}
