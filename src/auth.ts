import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

const DEFAULT_AUTH_URL = "http://localhost:3000";
const DEFAULT_SESSION_TTL = 60 * 60 * 24 * 7;

export const auth = betterAuth({
	appName: "Extra GitHub Tools",
	baseURL: process.env.AUTH_URL?.trim() ?? DEFAULT_AUTH_URL,
	trustedOrigins: [process.env.AUTH_URL?.trim() ?? DEFAULT_AUTH_URL],
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
			clientId: process.env.GITHUB_CLIENT_ID?.trim() ?? "",
			clientSecret: process.env.GITHUB_CLIENT_SECRET?.trim() ?? "",
			scope: ["read:user", "user:email", "repo", "admin:org"],
		},
	},
	plugins: [tanstackStartCookies()],
});
