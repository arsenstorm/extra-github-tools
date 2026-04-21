import { auth, getGitHubClientId } from "./auth";
import { type GitHubViewer, getGitHubViewer } from "./github";

export interface SessionSummary {
	user: {
		email: string;
		image: string | null | undefined;
		name: string;
	};
}

export interface GitHubSessionSummary {
	hasAccessToken: boolean;
	scopes: string[];
	viewer: GitHubViewer | null;
}

export interface AppSessionData {
	github: GitHubSessionSummary | null;
	githubClientId: string | null;
	session: SessionSummary | null;
}

export const toSessionSummary = (
	session: Awaited<ReturnType<typeof auth.api.getSession>>
): SessionSummary | null => {
	if (!session) {
		return null;
	}

	return {
		user: {
			email: session.user.email,
			image: session.user.image,
			name: session.user.name,
		},
	};
};

export async function getGitHubAccessTokenFromHeaders(
	headers: Headers
): Promise<{
	accessToken: string;
	scopes: string[];
} | null> {
	const session = await auth.api.getSession({ headers });

	if (!session) {
		return null;
	}

	try {
		const result = await auth.api.getAccessToken({
			body: {
				providerId: "github",
			},
			headers,
		});

		if (!result.accessToken) {
			return null;
		}

		return {
			accessToken: result.accessToken,
			scopes: result.scopes ?? [],
		};
	} catch {
		return null;
	}
}

export async function getAppSessionData(
	headers: Headers
): Promise<AppSessionData> {
	const session = await auth.api.getSession({ headers });
	const sessionSummary = toSessionSummary(session);
	const githubClientId = getGitHubClientId();

	if (!sessionSummary) {
		return {
			github: null,
			githubClientId,
			session: null,
		};
	}

	const githubAuth = await getGitHubAccessTokenFromHeaders(headers);

	if (!githubAuth) {
		return {
			github: {
				hasAccessToken: false,
				scopes: [],
				viewer: null,
			},
			githubClientId,
			session: sessionSummary,
		};
	}

	try {
		const viewer = await getGitHubViewer(githubAuth.accessToken);

		return {
			github: {
				hasAccessToken: true,
				scopes: githubAuth.scopes,
				viewer,
			},
			githubClientId,
			session: sessionSummary,
		};
	} catch {
		return {
			github: {
				hasAccessToken: true,
				scopes: githubAuth.scopes,
				viewer: null,
			},
			githubClientId,
			session: sessionSummary,
		};
	}
}
