import { createFileRoute } from "@tanstack/react-router";
import PageHeading from "@/components/page-heading";
import { TextLink } from "@/components/ui/text";

const policySections = [
	{
		body: [
			"Last updated: April 20, 2026",
			"Extra GitHub Tools uses GitHub sign-in to let you run repository tools that require GitHub permissions. This page explains what data is processed and how this TanStack Start version differs from the older database-backed implementation.",
		],
		title: "Overview",
	},
	{
		body: [
			"We may receive your name, email address, avatar image, GitHub username, and the GitHub permissions you grant during sign in.",
			"We also process the repository and organization data that the selected tool needs in order to list repositories, transfer them, or calculate contribution statistics.",
		],
		title: "Information We Process",
	},
	{
		body: [
			"This version of the app runs Better Auth in a stateless mode. Session information is stored in encrypted auth cookies instead of a separate application database.",
			"When a tool needs GitHub access, the server resolves the current GitHub access token from the Better Auth account cookie and uses it server side. The browser is not given the raw GitHub token.",
			"We do not keep a separate persistent token table for GitHub access in this TanStack Start implementation.",
		],
		title: "How Authentication Works",
	},
	{
		body: [
			"We use the data above to authenticate you, render the signed-in experience, perform GitHub operations you explicitly request, and respond to contact submissions.",
			"If you send a contact message, the form is submitted to the configured Formspark endpoint so that we can receive and respond to it.",
		],
		title: "How We Use Data",
	},
	{
		body: [
			"We share data with infrastructure and service providers only when needed to operate the service, such as GitHub for GitHub API calls and Formspark for contact form delivery.",
			"We do not sell your personal data.",
		],
		title: "Sharing",
	},
	{
		body: [
			"Because auth is stateless here, most session state lives in cookies that expire based on the configured Better Auth session lifetime.",
			"GitHub API results may appear transiently in server memory while a request is being handled, but this app is not designed around a long-lived application database for user auth data.",
		],
		title: "Retention",
	},
	{
		body: [
			"You can stop using the service at any time and revoke the GitHub application's access from your GitHub settings.",
			"If you have questions about your data or want us to investigate a concern, contact us at ",
		],
		title: "Your Choices",
	},
	{
		body: [
			'We may update this policy from time to time. If we do, the latest version will be posted on this page with a new "Last updated" date.',
		],
		title: "Changes",
	},
] as const;

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () => ({
		meta: [
			{
				title: "Privacy Policy - Extra GitHub Tools",
			},
			{
				content: "Privacy is important. This is what we do with your data.",
				name: "description",
			},
		],
	}),
});

export function PrivacyPage() {
	return (
		<div>
			<PageHeading
				description="Privacy is important. This is what we do with your data."
				title="Privacy Policy"
			/>
			<article className="prose prose-zinc dark:prose-invert max-w-none">
				{policySections.map((section) => (
					<section key={section.title}>
						<h2>{section.title}</h2>
						{section.body.map((paragraph) => (
							<p key={`${section.title}-${paragraph}`}>
								{paragraph}
								{section.title === "Your Choices" &&
								paragraph.startsWith("If you have questions") ? (
									<TextLink href="mailto:privacy@extragithub.tools">
										privacy@extragithub.tools
									</TextLink>
								) : null}
							</p>
						))}
					</section>
				))}
				<section>
					<h2>Contact Us</h2>
					<p>
						You can contact us by email at{" "}
						<TextLink href="mailto:privacy@extragithub.tools">
							privacy@extragithub.tools
						</TextLink>{" "}
						or by visiting the <TextLink href="/contact">contact page</TextLink>
						.
					</p>
				</section>
			</article>
		</div>
	);
}
