import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

const DEFAULT_AUTH_URL = "http://localhost:3000";
const DEFAULT_SESSION_TTL = 60 * 60 * 24 * 7;

const normalizeEnvironmentValue = (
	value: string | null | undefined
): string | null => {
	const trimmedValue = value?.trim();

	return trimmedValue ? trimmedValue : null;
};

export const getAuthBaseUrl = (): string =>
	normalizeEnvironmentValue(process.env.AUTH_URL) ?? DEFAULT_AUTH_URL;

export const getTrustedOrigins = (): string[] => {
	const configuredOrigins =
		normalizeEnvironmentValue(process.env.AUTH_TRUSTED_ORIGINS)
			?.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean) ?? [];

	return [...new Set([getAuthBaseUrl(), ...configuredOrigins])];
};

export const getGitHubClientId = (): string | null =>
	normalizeEnvironmentValue(process.env.GITHUB_CLIENT_ID);

const getGitHubClientSecret = (): string | null =>
	normalizeEnvironmentValue(process.env.GITHUB_CLIENT_SECRET);

export const getGitHubInstallationSettingsUrl = (): string | null => {
	const clientId = getGitHubClientId();

	return clientId
		? `https://github.com/settings/connections/applications/${clientId}`
		: null;
};

export const auth = betterAuth({
	appName: "Extra GitHub Tools",
	baseURL: getAuthBaseUrl(),
	trustedOrigins: getTrustedOrigins(),
	secret: normalizeEnvironmentValue(process.env.AUTH_SECRET) ?? undefined,
	session: {
		expiresIn: DEFAULT_SESSION_TTL,
		cookieCache: {
			enabled: true,
			maxAge: DEFAULT_SESSION_TTL,
			refreshCache: true,
			strategy: "jwe",
			version: "1",
		},
	},
	account: {
		storeAccountCookie: true,
		storeStateStrategy: "cookie",
		updateAccountOnSignIn: true,
	},
	socialProviders: {
		github: {
			clientId: getGitHubClientId() ?? "",
			clientSecret: getGitHubClientSecret() ?? "",
			scope: ["read:user", "user:email", "repo", "admin:org"],
		},
	},
	plugins: [tanstackStartCookies()],
});
