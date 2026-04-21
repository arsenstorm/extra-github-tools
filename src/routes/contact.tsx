import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppSession } from "@/app-session";
import PageHeading from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import {
	Description,
	Field,
	FieldGroup,
	Fieldset,
	Label,
} from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Listbox, ListboxLabel, ListboxOption } from "@/components/ui/listbox";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { submitContactRequestAction } from "@/server-functions";

export const Route = createFileRoute("/contact")({
	component: ContactPage,
	head: () => ({
		meta: [
			{
				title: "Contact - Extra GitHub Tools",
			},
			{
				content:
					"Have a question, message or suggestion? We’d love to hear from you.",
				name: "description",
			},
		],
	}),
});

export function ContactPage() {
	const { session } = useAppSession();
	const submitContactRequest = useServerFn(submitContactRequestAction);
	const [email, setEmail] = useState(session?.user.email ?? "");
	const [message, setMessage] = useState("");
	const [messageType, setMessageType] = useState("general");
	const [name, setName] = useState(session?.user.name ?? "");
	const [submissionState, setSubmissionState] = useState<
		"error" | "idle" | "loading" | "success"
	>("idle");

	useEffect(() => {
		setEmail(session?.user.email ?? "");
		setName(session?.user.name ?? "");
	}, [session]);

	return (
		<div>
			<PageHeading
				description="Have a question, message or suggestion? We’d love to hear from you!"
				title="Contact us"
			/>
			<form
				className="my-8"
				onSubmit={(event) => {
					event.preventDefault();

					toast.promise(
						(async () => {
							setSubmissionState("loading");

							const result = await submitContactRequest({
								data: {
									email,
									message,
									name,
									type: messageType,
								},
							});

							if (!result.success) {
								setSubmissionState("error");
								throw new Error(result.error ?? "Failed to send the message.");
							}

							setSubmissionState("success");
							setMessage("");
							return true;
						})(),
						{
							error: (error) =>
								error instanceof Error
									? error.message
									: "Failed to send the message.",
							loading: "Sending message...",
							success: "Awesome! We’ll get back to you soon.",
						}
					);
				}}
			>
				<Fieldset>
					<FieldGroup>
						<Field>
							<Label>Message Type</Label>
							<Listbox
								disabled={submissionState === "loading"}
								name="type"
								onChange={setMessageType}
								value={messageType}
							>
								<ListboxOption value="general">
									<ListboxLabel>General Enquiries</ListboxLabel>
								</ListboxOption>
								<ListboxOption value="feature">
									<ListboxLabel>Feature Request</ListboxLabel>
								</ListboxOption>
								<ListboxOption value="bug">
									<ListboxLabel>Bug Report</ListboxLabel>
								</ListboxOption>
								<ListboxOption value="other">
									<ListboxLabel>Other</ListboxLabel>
								</ListboxOption>
							</Listbox>
							<Description>What kind of message can we expect?</Description>
						</Field>
						<Field>
							<Label>Your name</Label>
							<Input
								disabled={submissionState === "loading"}
								name="name"
								onChange={(event) => setName(event.target.value)}
								required
								value={name}
							/>
							<Description>So we know who you are.</Description>
						</Field>
						<Field>
							<Label>Your Email</Label>
							<Input
								disabled={submissionState === "loading"}
								name="email"
								onChange={(event) => setEmail(event.target.value)}
								required
								type="email"
								value={email}
							/>
							<Description>So we can get back to you.</Description>
						</Field>
						<Field>
							<Label>Your Message</Label>
							<Textarea
								disabled={submissionState === "loading"}
								name="message"
								onChange={(event) => setMessage(event.target.value)}
								required
								value={message}
							/>
							<Description>What would you like to say?</Description>
						</Field>
						<Field>
							<Button
								disabled={
									submissionState === "loading" || !message || !name || !email
								}
								type="submit"
							>
								Send Message
							</Button>
						</Field>
					</FieldGroup>
				</Fieldset>
			</form>
			{submissionState === "success" ? (
				<Text>Thanks for reaching out. Your message has been sent.</Text>
			) : null}
		</div>
	);
}
