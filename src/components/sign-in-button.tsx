"use client";

import { toast } from "sonner";
import { authClient } from "@/auth.client";
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
				const { error } = await authClient.signIn.social({
					callbackURL: "/",
					provider: "github",
				});

				if (error) {
					toast.error("Failed to start GitHub sign-in.");
				}
			}}
		>
			Sign in with GitHub
		</Button>
	);
}
