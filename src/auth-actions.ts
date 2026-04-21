import { createClientOnlyFn } from "@tanstack/react-start";

export const startGitHubSignIn = createClientOnlyFn(
	async (callbackURL: string) => {
		const { authClient } = await import("./auth.client");

		return authClient.signIn.social({
			callbackURL,
			provider: "github",
		});
	}
);

export const signOutUser = createClientOnlyFn(async () => {
	const { authClient } = await import("./auth.client");

	return authClient.signOut();
});
