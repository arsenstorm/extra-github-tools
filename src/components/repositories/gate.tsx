import RequireSignIn from "@/components/require-sign-in";

const GITHUB_ACCESS_REFRESH_DESCRIPTION =
	"Your session is active, but GitHub access is unavailable. Sign in with GitHub again to continue.";

export function GitHubAccessGate({
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
				description={GITHUB_ACCESS_REFRESH_DESCRIPTION}
				title="GitHub access needs refreshing"
			/>
		);
	}

	return <>{children}</>;
}
