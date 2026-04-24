import RequireSignIn from "@/components/require-sign-in";
import { getGitHubAccessRefreshDescription } from "./utils";

export function TransferGate({
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
