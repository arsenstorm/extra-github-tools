"use client";

import SignInButton from "./sign-in-button";
import { Heading } from "./ui/heading";
import { Text } from "./ui/text";

export default function RequireSignIn({
	description = "To use this tool, you need to sign in with your GitHub account.",
	title = "Sign in to use this tool",
}: Readonly<{
	description?: string;
	title?: string;
}>) {
	return (
		<div className="w-full rounded-lg ring-2 ring-zinc-300 dark:ring-zinc-700">
			<div className="p-4">
				<Heading level={2}>{title}</Heading>
				<Text>{description}</Text>
				<div className="mt-4">
					<SignInButton />
				</div>
			</div>
		</div>
	);
}
