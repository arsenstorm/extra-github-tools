import { createHmac, timingSafeEqual } from "node:crypto";

export const GITHUB_SIGNATURE_HEADER = "X-Hub-Signature-256";

export function verifyGitHubWebhookSignature(
	body: string,
	signature: string,
	secret: string
): boolean {
	const digest = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
	const providedSignature = Buffer.from(signature);
	const expectedSignature = Buffer.from(digest);

	if (providedSignature.length !== expectedSignature.length) {
		return false;
	}

	return timingSafeEqual(providedSignature, expectedSignature);
}
