import { createFileRoute } from "@tanstack/react-router";
import {
	GITHUB_SIGNATURE_HEADER,
	verifyGitHubWebhookSignature,
} from "@/webhooks";

export const Route = createFileRoute("/api/webhooks")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const signature = request.headers.get(GITHUB_SIGNATURE_HEADER);

				if (!signature) {
					return Response.json(
						{
							accepted: false,
							error: "No signature provided",
						},
						{
							status: 400,
						}
					);
				}

				const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();

				if (!secret) {
					return Response.json(
						{
							accepted: false,
							error: "Webhook secret is not configured",
						},
						{
							status: 500,
						}
					);
				}

				const body = await request.text();

				if (!verifyGitHubWebhookSignature(body, signature, secret)) {
					return Response.json(
						{
							accepted: false,
							error: "Invalid signature",
						},
						{
							status: 400,
						}
					);
				}

				return Response.json(
					{
						accepted: true,
					},
					{
						status: 200,
					}
				);
			},
		},
	},
});
