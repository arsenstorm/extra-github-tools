import RequireSignIn from "@/components/require-sign-in";

const getGitHubAccessRefreshDescription = (): string =>
	"Your session is active, but GitHub access is unavailable. Sign in with GitHub again to continue.";

export function FameGate({
	children,
	hasGitHubAccess,
	isSignedIn,
}: Readonly<{
	children: React.ReactNode;
	hasGitHubAccess: boolean;
	isSignedIn: boolean;
}>) {
	if (!isSignedIn) {
		return <RequireSignIn />;
	}

	if (!hasGitHubAccess) {
		return (
			<RequireSignIn
				description={getGitHubAccessRefreshDescription()}
				title="GitHub access needs refreshing"
			/>
		);
	}

	return <>{children}</>;
}
