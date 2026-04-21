"use client";

import { toast } from "sonner";
import { startGitHubSignIn } from "@/auth-actions";
import { Button } from "@/components/ui/button";

export default function SignInButton({
	disabled = false,
}: Readonly<{
	disabled?: boolean;
}>) {
	return (
		<Button
			color="dark/white"
			disabled={disabled}
			onClick={async () => {
				const callbackURL =
					typeof window === "undefined"
						? "/"
						: `${window.location.pathname}${window.location.search}${window.location.hash}`;
				const { error } = await startGitHubSignIn(
					callbackURL.length > 0 ? callbackURL : "/"
				);

				if (error) {
					toast.error("Failed to start GitHub sign-in.");
				}
			}}
		>
			Sign in with GitHub
		</Button>
	);
}
