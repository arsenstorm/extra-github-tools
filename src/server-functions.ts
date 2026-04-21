import { createServerFn } from "@tanstack/react-start";
import {
	analyzeGitHubRepository,
	type GitHubAccount,
	type GitHubRepository,
	listGitHubAccounts,
	listGitHubRepositories,
	type RepoStats,
	type TransferRepositoryResult,
	transferGitHubRepositories,
} from "./github";

const GITHUB_ACCESS_REQUIRED_MESSAGE =
	"We couldn’t find your GitHub access or your session has expired. Please sign in again.";

const normalizeOptionalString = (
	value: string | null | undefined
): string | undefined => {
	const trimmedValue = value?.trim();

	return trimmedValue ? trimmedValue : undefined;
};

const toMessage = (error: unknown, fallbackMessage: string): string =>
	error instanceof Error ? error.message : fallbackMessage;

const getGitHubAccessFromHeaders = async (headers: Headers) => {
	const { getGitHubAccessTokenFromHeaders } = await import("./auth.server");

	return getGitHubAccessTokenFromHeaders(headers);
};

export interface TransferSearchInput {
	from?: string;
	to?: string;
}

export interface TransferPageData {
	error: string | null;
	organizations: GitHubAccount[] | null;
	repositories: GitHubRepository[] | null;
}

export interface TransferRepositoriesInput {
	from: string;
	repositories: string[];
	to: string;
}

export interface TransferRepositoriesResult {
	error: string | null;
	results: TransferRepositoryResult[] | null;
	success: boolean;
}

export interface FameSearchInput {
	org?: string;
	repo?: string;
}

export interface FamePageData {
	error: string | null;
	organizations: GitHubAccount[] | null;
	repositories: GitHubRepository[] | null;
	stats: RepoStats | null;
}

export interface ContactFormInput {
	email: string;
	message: string;
	name: string;
	type: string;
}

export interface ContactSubmissionResult {
	error: string | null;
	success: boolean;
}

const validateTransferSearchInput = (
	data: TransferSearchInput
): TransferSearchInput => ({
	from: normalizeOptionalString(data.from),
	to: normalizeOptionalString(data.to),
});

const validateFameSearchInput = (data: FameSearchInput): FameSearchInput => ({
	org: normalizeOptionalString(data.org),
	repo: normalizeOptionalString(data.repo),
});

const validateTransferRepositoriesInput = (
	data: TransferRepositoriesInput
): TransferRepositoriesInput => ({
	from: data.from.trim(),
	repositories: data.repositories.map((repository) => repository.trim()),
	to: data.to.trim(),
});

const validateContactFormInput = (
	data: ContactFormInput
): ContactFormInput => ({
	email: data.email.trim(),
	message: data.message.trim(),
	name: data.name.trim(),
	type: data.type.trim(),
});

export async function resolveTransferPageData(
	headers: Headers,
	input: TransferSearchInput
): Promise<TransferPageData> {
	const search = validateTransferSearchInput(input);
	const githubAuth = await getGitHubAccessFromHeaders(headers);

	if (!githubAuth) {
		return {
			error: null,
			organizations: null,
			repositories: null,
		};
	}

	try {
		if (!search.from) {
			return {
				error: null,
				organizations: await listGitHubAccounts(githubAuth.accessToken),
				repositories: null,
			};
		}

		if (!search.to) {
			const organizations = await listGitHubAccounts(githubAuth.accessToken);

			return {
				error: null,
				organizations: organizations.filter(
					(organization) => organization.handle !== search.from
				),
				repositories: null,
			};
		}

		return {
			error: null,
			organizations: null,
			repositories: await listGitHubRepositories(
				githubAuth.accessToken,
				search.from
			),
		};
	} catch (error) {
		return {
			error: toMessage(error, "Failed to load transfer data."),
			organizations: null,
			repositories: null,
		};
	}
}

export async function resolveFamePageData(
	headers: Headers,
	input: FameSearchInput
): Promise<FamePageData> {
	const search = validateFameSearchInput(input);
	const githubAuth = await getGitHubAccessFromHeaders(headers);

	if (!githubAuth) {
		return {
			error: null,
			organizations: null,
			repositories: null,
			stats: null,
		};
	}

	try {
		if (!search.org) {
			return {
				error: null,
				organizations: await listGitHubAccounts(githubAuth.accessToken),
				repositories: null,
				stats: null,
			};
		}

		if (!search.repo) {
			return {
				error: null,
				organizations: null,
				repositories: await listGitHubRepositories(
					githubAuth.accessToken,
					search.org
				),
				stats: null,
			};
		}

		return {
			error: null,
			organizations: null,
			repositories: null,
			stats: await analyzeGitHubRepository(
				githubAuth.accessToken,
				search.org,
				search.repo
			),
		};
	} catch (error) {
		return {
			error: toMessage(error, "Failed to load repository analysis."),
			organizations: null,
			repositories: null,
			stats: null,
		};
	}
}

export async function submitContactRequestToFormspark(
	input: ContactFormInput,
	formsparkUrl: string | null | undefined,
	fetchImplementation: typeof fetch = fetch
): Promise<ContactSubmissionResult> {
	if (!formsparkUrl?.trim()) {
		return {
			error: "FORMSPARK_URL is not configured.",
			success: false,
		};
	}

	const response = await fetchImplementation(formsparkUrl, {
		body: JSON.stringify(input),
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		method: "POST",
	});

	if (!response.ok) {
		return {
			error: (await response.text()).trim() || "Failed to submit the message.",
			success: false,
		};
	}

	return {
		error: null,
		success: true,
	};
}

export const getTransferPageData = createServerFn({ method: "GET" })
	.inputValidator(validateTransferSearchInput)
	.handler(async ({ data }) => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");

		return resolveTransferPageData(getRequestHeaders(), data);
	});

export const transferRepositoriesAction = createServerFn({ method: "POST" })
	.inputValidator(validateTransferRepositoriesInput)
	.handler(async ({ data }): Promise<TransferRepositoriesResult> => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		const githubAuth = await getGitHubAccessFromHeaders(getRequestHeaders());

		if (!githubAuth) {
			return {
				error: GITHUB_ACCESS_REQUIRED_MESSAGE,
				results: null,
				success: false,
			};
		}

		if (data.repositories.length === 0) {
			return {
				error: "Select at least one repository to transfer.",
				results: null,
				success: false,
			};
		}

		try {
			const results = await transferGitHubRepositories(
				githubAuth.accessToken,
				data.from,
				data.to,
				data.repositories
			);

			return {
				error: null,
				results,
				success: true,
			};
		} catch (error) {
			return {
				error: toMessage(error, "Failed to transfer repositories."),
				results: null,
				success: false,
			};
		}
	});

export const getFamePageData = createServerFn({ method: "GET" })
	.inputValidator(validateFameSearchInput)
	.handler(async ({ data }) => {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");

		return resolveFamePageData(getRequestHeaders(), data);
	});

export const submitContactRequestAction = createServerFn({ method: "POST" })
	.inputValidator(validateContactFormInput)
	.handler(async ({ data }) =>
		submitContactRequestToFormspark(data, process.env.FORMSPARK_URL)
	);
