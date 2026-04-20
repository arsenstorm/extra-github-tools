import { createFileRoute } from "@tanstack/react-router";
import PageHeading from "@/components/page-heading";
import RequireSignIn from "@/components/require-sign-in";
import { Avatar } from "@/components/ui/avatar";
import { Heading, Subheading } from "@/components/ui/heading";
import { Code, Strong, Text, TextLink } from "@/components/ui/text";
import { getHomePageData } from "@/home-page-data";

export const Route = createFileRoute("/")({
	loader: () => getHomePageData(),
	component: Home,
});

function Home() {
	const { github, session } = Route.useLoaderData();

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 sm:px-10">
			<PageHeading description="Stateless GitHub auth for production deployments with Better Auth and TanStack Start." />
			{session ? (
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
					<section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
						<div className="flex items-start gap-4">
							<Avatar
								alt={
									github?.viewer.name ??
									github?.viewer.login ??
									session.user.name
								}
								initials={github?.viewer.login?.slice(0, 1).toUpperCase()}
								src={github?.viewer.avatarUrl ?? session.user.image}
							/>
							<div className="space-y-1">
								<Subheading level={2}>
									{github?.viewer.name ?? session.user.name}
								</Subheading>
								<Text>
									Signed in as{" "}
									<Strong>{github?.viewer.login ?? session.user.email}</Strong>
								</Text>
								{github ? (
									<Text>
										GitHub token is available server-side and is being used
										through <Code>auth.api.getAccessToken</Code>.
									</Text>
								) : (
									<Text>
										Session is active, but no GitHub account cookie is currently
										available. Sign out and sign back in after setting the new
										auth env vars.
									</Text>
								)}
							</div>
						</div>
						{github ? (
							<div className="mt-6 space-y-4">
								<div>
									<Subheading level={3}>Granted scopes</Subheading>
									<div className="mt-3 flex flex-wrap gap-2">
										{github.scopes.map((scope) => (
											<span
												className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
												key={scope}
											>
												{scope}
											</span>
										))}
									</div>
								</div>
								<Text>
									Server-side GitHub requests can now use the stateless helper
									in <Code>src/auth.server.ts</Code> without querying a database
									for the OAuth token.
								</Text>
								<Text>
									Current GitHub profile:{" "}
									<TextLink href={github.viewer.htmlUrl}>
										@{github.viewer.login}
									</TextLink>
								</Text>
							</div>
						) : null}
					</section>
					<section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
						<Heading level={2}>How this now works</Heading>
						<div className="mt-4 space-y-3">
							<Text>
								<Strong>No database is configured.</Strong> Better Auth runs in
								stateless mode and stores session data in an encrypted cookie.
							</Text>
							<Text>
								The GitHub OAuth account is persisted in the Better Auth account
								cookie because <Code>account.storeAccountCookie</Code> is
								enabled.
							</Text>
							<Text>
								Server code resolves the token from the request headers, calls
								GitHub, and only returns safe profile data to the browser.
							</Text>
						</div>
					</section>
				</div>
			) : (
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
					<RequireSignIn />
					<section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
						<Heading level={2}>Production notes</Heading>
						<div className="mt-4 space-y-3">
							<Text>
								Set <Code>BETTER_AUTH_URL</Code> to your production origin and
								keep <Code>BETTER_AUTH_SECRET</Code> stable across deploys.
							</Text>
							<Text>
								Add your production hostname to{" "}
								<Code>BETTER_AUTH_TRUSTED_ORIGINS</Code> if you need preview or
								secondary origins.
							</Text>
							<Text>
								The GitHub OAuth callback URL should be{" "}
								<Code>https://your-domain/api/auth/callback/github</Code>.
							</Text>
							<Text>
								Bump <Code>BETTER_AUTH_SESSION_VERSION</Code> when you want to
								invalidate all existing stateless sessions.
							</Text>
						</div>
					</section>
				</div>
			)}
		</main>
	);
}
