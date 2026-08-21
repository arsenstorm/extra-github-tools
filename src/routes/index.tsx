import { createFileRoute } from "@tanstack/react-router";
import PageHeading from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Subheading } from "@/components/ui/heading";
import { Strong, Text, TextLink } from "@/components/ui/text";
import { TOOL_LIST } from "@/tools";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading />
			<main className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{TOOL_LIST.filter((tool) => tool.enabled).map((tool) => (
					<div
						className="flex flex-col rounded-lg bg-zinc-200 p-4 ring ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700"
						key={tool.href}
					>
						<Subheading level={3}>{tool.title}</Subheading>
						<Text className="mb-4">{tool.description}</Text>
						<Button className="mt-auto" color={tool.color} href={tool.href}>
							{tool.title}
						</Button>
					</div>
				))}
			</main>
			<Divider className="my-6" />
			<div className="flex max-w-2xl flex-col gap-y-4">
				<div>
					<Subheading level={2}>About this project</Subheading>
					<Text>
						I started this project in open source because I needed a tool that
						could help me transfer repositories between organisations and
						personal accounts and one was not readily available.
					</Text>
				</div>
				<div>
					<Subheading level={2}>Important Information</Subheading>
					<Text>
						When you sign in with GitHub, your GitHub access is resolved
						server-side from encrypted auth cookies when a tool needs it.
					</Text>
					<Text>
						The code is <Strong>100% open source</Strong> and you can{" "}
						<TextLink href="https://github.com/arsenstorm/extra-github-tools">
							find it here on GitHub
						</TextLink>
						.
					</Text>
				</div>
				<div>
					<Subheading level={2}>More tools</Subheading>
					<Text>
						If you have any ideas for tools that you’d like to see, send me an
						email at{" "}
						<TextLink href="mailto:arsen@shkrumelyak.com">
							arsen@shkrumelyak.com
						</TextLink>
						.
					</Text>
				</div>
			</div>
		</div>
	);
}
