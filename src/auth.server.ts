import { auth } from "./auth";

export interface SessionSummary {
	user: {
		email: string;
		image: string | null | undefined;
		name: string;
	};
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
	session: SessionSummary;
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
			session: toSessionSummary(session) as SessionSummary,
		};
	} catch {
		return null;
	}
}
