import {
	createGitHubError,
	createRequestContext,
	fetchGitHubResponse,
	type GitHubRequestContext,
	getErrorMessage,
	jsonRequestInit,
	mapWithConcurrency,
	repositoryPathname,
	type Sleep,
	sleep,
} from "./client";
import type {
	TransferGitHubRepositoriesOptions,
	TransferRepositoryArchiveState,
	TransferRepositoryResult,
	TransferRepositorySettingsResult,
	TransferRepositoryVisibility,
} from "./types";

const DEFAULT_TRANSFER_SETTINGS_ATTEMPTS = 10;
const DEFAULT_TRANSFER_SETTINGS_DELAY_MS = 2000;
const MAX_TRANSFER_CONCURRENCY = 3;
const REPOSITORY_OPERATION_IN_PROGRESS_MESSAGE =
	"previous repository operation is still in progress";

interface RepositorySettingsRequestBody {
	archived?: boolean;
	private?: boolean;
}

interface PostTransferSettings {
	archiveState: TransferRepositoryArchiveState;
	delayMs: number;
	maxAttempts: number;
	sleep: Sleep;
	visibility: TransferRepositoryVisibility;
}

interface RepositoryTransfer {
	from: string;
	newName: string;
	repository: string;
	to: string;
}

const createSettingsRequestBody = ({
	archiveState,
	visibility,
}: PostTransferSettings): RepositorySettingsRequestBody => {
	const body: RepositorySettingsRequestBody = {};

	if (visibility !== "current") {
		body.private = visibility === "private";
	}

	if (archiveState !== "current") {
		body.archived = archiveState === "archived";
	}

	return body;
};

/** GitHub keeps returning 404/409 (or a 422 "operation in progress") for a short while after a transfer. */
const isRetryableSettingsResponse = (
	response: Response,
	errorMessage: string
): boolean => {
	if (response.status === 404 || response.status === 409) {
		return true;
	}

	return (
		response.status === 422 &&
		errorMessage
			.toLowerCase()
			.includes(REPOSITORY_OPERATION_IN_PROGRESS_MESSAGE)
	);
};

const createSettingsResult = (
	response: Pick<Response, "ok" | "status" | "statusText">,
	error: string | null
): TransferRepositorySettingsResult => ({
	error,
	ok: response.ok,
	status: response.status,
	statusText: response.statusText,
});

const attemptSettingsPatch = async (
	context: GitHubRequestContext,
	transfer: RepositoryTransfer,
	body: RepositorySettingsRequestBody
): Promise<{
	result: TransferRepositorySettingsResult;
	shouldRetry: boolean;
}> => {
	try {
		const response = await fetchGitHubResponse(
			context,
			repositoryPathname(transfer.to, transfer.newName),
			jsonRequestInit("PATCH", body)
		);

		if (response.ok) {
			return {
				result: createSettingsResult(response, null),
				shouldRetry: false,
			};
		}

		const error = await createGitHubError(
			response,
			`Transferred ${transfer.newName}, but failed to update repository settings.`
		);

		return {
			result: createSettingsResult(response, error.message),
			shouldRetry: isRetryableSettingsResponse(response, error.message),
		};
	} catch (error) {
		return {
			result: createSettingsResult(
				{ ok: false, status: 0, statusText: "Request failed" },
				getErrorMessage(error, "Repository settings update failed.")
			),
			shouldRetry: true,
		};
	}
};

const updateTransferredRepositorySettings = async (
	context: GitHubRequestContext,
	transfer: RepositoryTransfer,
	settings: PostTransferSettings
): Promise<TransferRepositorySettingsResult | undefined> => {
	const body = createSettingsRequestBody(settings);

	if (body.private === undefined && body.archived === undefined) {
		return;
	}

	for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
		// biome-ignore lint/performance/noAwaitInLoops: retries are sequential by design
		const { result, shouldRetry } = await attemptSettingsPatch(
			context,
			transfer,
			body
		);

		if (result.ok || !shouldRetry || attempt === settings.maxAttempts) {
			return result;
		}

		await settings.sleep(settings.delayMs);
	}

	return {
		error: "Repository settings update did not return a result.",
		ok: false,
		status: 0,
		statusText: "Missing result",
	};
};

const createTransferResult = (
	transfer: RepositoryTransfer,
	response: Pick<Response, "ok" | "status" | "statusText">,
	error: string | null
): TransferRepositoryResult => ({
	error,
	newName: transfer.newName,
	ok: response.ok,
	repository: transfer.repository,
	status: response.status,
	statusText: response.statusText,
});

const transferOneRepository = async (
	context: GitHubRequestContext,
	transfer: RepositoryTransfer,
	settings: PostTransferSettings
): Promise<TransferRepositoryResult> => {
	const { newName, repository } = transfer;

	try {
		const response = await fetchGitHubResponse(
			context,
			`${repositoryPathname(transfer.from, repository)}/transfer`,
			jsonRequestInit("POST", {
				...(newName === repository ? {} : { new_name: newName }),
				new_owner: transfer.to,
			})
		);

		if (!response.ok) {
			const error = await createGitHubError(
				response,
				`Failed to transfer ${repository}.`
			);

			return createTransferResult(transfer, response, error.message);
		}

		const postTransferSettings = await updateTransferredRepositorySettings(
			context,
			transfer,
			settings
		);

		return {
			...createTransferResult(transfer, response, null),
			...(postTransferSettings ? { postTransferSettings } : {}),
		};
	} catch (error) {
		return createTransferResult(
			transfer,
			{ ok: false, status: 0, statusText: "Request failed" },
			getErrorMessage(error, "Transfer failed.")
		);
	}
};

export async function transferGitHubRepositories(
	accessToken: string,
	from: string,
	to: string,
	repositories: string[],
	fetchImplementation: typeof fetch = fetch,
	options: TransferGitHubRepositoriesOptions = {}
): Promise<TransferRepositoryResult[]> {
	const context = createRequestContext(accessToken, fetchImplementation);
	const settings: PostTransferSettings = {
		archiveState: options.archiveState ?? "current",
		delayMs:
			options.settingsUpdateDelayMs ?? DEFAULT_TRANSFER_SETTINGS_DELAY_MS,
		maxAttempts:
			options.maxSettingsUpdateAttempts ?? DEFAULT_TRANSFER_SETTINGS_ATTEMPTS,
		sleep: options.sleep ?? sleep,
		visibility: options.visibility ?? "current",
	};
	const namePrefix = options.namePrefix ?? "";
	const nameSuffix = options.nameSuffix ?? "";

	return await mapWithConcurrency(
		repositories,
		MAX_TRANSFER_CONCURRENCY,
		(repository) =>
			transferOneRepository(
				context,
				{
					from,
					newName: `${namePrefix}${repository}${nameSuffix}`,
					repository,
					to,
				},
				settings
			)
	);
}
