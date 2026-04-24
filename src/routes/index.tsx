import { createFileRoute } from "@tanstack/react-router";
import PageHeading from "@/components/page-heading";
import { Button, type Colors } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Subheading } from "@/components/ui/heading";
import { Strong, Text, TextLink } from "@/components/ui/text";
import { CONFIG } from "@/config";

const options: {
	enabled?: boolean;
	description: string;
	label: string;
	link: { color: Colors; href: string; label: string };
}[] = [
	{
		enabled: CONFIG.bulkTransferRepositories.enabled,
		description:
			"Move your repositories in bulk between organizations and personal accounts.",
		label: "Bulk Transfer Repositories",
		link: {
			color: "cyan",
			href: "/transfer",
			label: "Bulk Transfer Repositories",
		},
	},
	{
		enabled: CONFIG.commitFame.enabled,
		description:
			"See how your commits compare to your colleagues and who's doing more.",
		label: "Commit Fame",
		link: {
			color: "amber",
			href: "/fame",
			label: "Commit Fame",
		},
	},
];

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="flex h-full flex-col justify-center">
			<PageHeading />
			<main className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{options
					.filter((option) => option.enabled ?? true)
					.map(({ description, label, link }) => (
						<div
							className="flex flex-col rounded-lg bg-zinc-200 p-4 ring-2 ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700"
							key={label}
						>
							<Subheading level={3}>{label}</Subheading>
							<Text>{description}</Text>
							<Button className="mt-4" color={link.color} href={link.href}>
								{link.label}
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
