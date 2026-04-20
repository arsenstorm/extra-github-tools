const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_USER_AGENT = "extra-github-tools";

interface GitHubViewerResponse {
	avatar_url: string;
	html_url: string;
	login: string;
	name: string | null;
}

export interface GitHubViewer {
	avatarUrl: string;
	htmlUrl: string;
	login: string;
	name: string | null;
}

export async function getGitHubViewer(
	accessToken: string
): Promise<GitHubViewer> {
	const response = await fetch(`${GITHUB_API_URL}/user`, {
		cache: "no-store",
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${accessToken}`,
			"User-Agent": GITHUB_USER_AGENT,
			"X-GitHub-Api-Version": GITHUB_API_VERSION,
		},
	});

	if (!response.ok) {
		const errorText = await response.text();
		const errorMessage = errorText.trim();

		if (response.status === 403 && errorMessage.length > 0) {
			throw new Error(
				`GitHub returned 403 while loading the current user: ${errorMessage}`
			);
		}

		throw new Error(
			`GitHub returned ${response.status} while loading the current user.`
		);
	}

	const viewer = (await response.json()) as GitHubViewerResponse;

	return {
		avatarUrl: viewer.avatar_url,
		htmlUrl: viewer.html_url,
		login: viewer.login,
		name: viewer.name,
	};
}
