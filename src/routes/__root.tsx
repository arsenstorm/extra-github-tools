import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { AppSessionProvider } from "@/app-session";
import { Navigation } from "@/components/navigation";
import { getRootLayoutData } from "@/root-data";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	component: RootLayout,
	head: () => ({
		links: [
			{
				href: appCss,
				rel: "stylesheet",
			},
			{
				as: "font",
				crossOrigin: "anonymous",
				href: "/fonts/GeistVF.woff",
				rel: "preload",
				type: "font/woff",
			},
			{
				as: "font",
				crossOrigin: "anonymous",
				href: "/fonts/GeistMonoVF.woff",
				rel: "preload",
				type: "font/woff",
			},
		],
		meta: [
			{
				charSet: "utf-8",
			},
			{
				content: "width=device-width, initial-scale=1",
				name: "viewport",
			},
			{
				title: "Extra GitHub Tools",
			},
			{
				content:
					"Extra tools for GitHub that aren’t part of the main interface.",
				name: "description",
			},
		],
	}),
	loader: () => getRootLayoutData(),
	shellComponent: RootDocument,
});

function RootLayout() {
	const appSession = Route.useLoaderData();

	return (
		<AppSessionProvider value={appSession}>
			<Navigation>
				<Outlet />
			</Navigation>
		</AppSessionProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html className="h-full antialiased" lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="h-full bg-white font-sans text-zinc-950 lg:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:lg:bg-zinc-950">
				{children}
				<Toaster position="top-right" richColors />
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
