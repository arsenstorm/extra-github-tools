import {
	createGitHubError,
	fetchGitHubResponse,
	type GitHubRequestContext,
	getErrorMessage,
	getRetryAfterDelayMs,
	jsonRequestInit,
	mapWithConcurrency,
	repositoryPathname,
	type Sleep,
	sleep,
} from "./client";
import type {
	ManageGitHubRepositoriesOptions,
	ManageRepositoryActions,
	ManageRepositoryChange,
	ManageRepositoryResult,
	ManageSettingResult,
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "./types";

const DEFAULT_MANAGE_RATE_LIMIT_ATTEMPTS = 5;
const DEFAULT_MANAGE_RATE_LIMIT_DELAY_MS = 2000;
const MAX_MANAGE_CONCURRENCY = 3;
const NO_CHANGE_NEEDED_STATUS_TEXT = "No change needed";

interface ManageContext extends GitHubRequestContext {
	maxRateLimitAttempts: number;
	owner: string;
	rateLimitDelayMs: number;
	sleep: Sleep;
}

interface GitHubSubscriptionResponse {
	ignored: boolean;
	subscribed: boolean;
}

interface GitHubManagedRepositoryResponse {
	archived: boolean;
	visibility: string;
}

interface RepositorySettingsBody {
	archived?: boolean;
	visibility?: RepositoryVisibility;
}

interface RepositorySettingsResults {
	archive: ManageSettingResult | null;
	visibility: ManageSettingResult | null;
}

interface WantedRepositorySettings {
	archive: boolean;
	visibility: boolean;
}

const isRateLimitedResponse = (response: Response): boolean => {
	if (response.status === 429) {
		return true;
	}

	return (
		response.status === 403 &&
		(response.headers.has("Retry-After") ||
			response.headers.get("X-RateLimit-Remaining") === "0")
	);
};

const fetchWithRateLimitRetry = async (
	context: ManageContext,
	sendRequest: () => Promise<Response>
): Promise<Response> => {
	let response = await sendRequest();

	for (
		let attempt = 1;
		attempt < context.maxRateLimitAttempts && isRateLimitedResponse(response);
		attempt += 1
	) {
		// biome-ignore lint/performance/noAwaitInLoops: rate-limit retries are sequential by design
		await context.sleep(
			getRetryAfterDelayMs(response, context.rateLimitDelayMs)
		);
		response = await sendRequest();
	}

	return response;
};

const createUnchangedSettingResult = (): ManageSettingResult => ({
	error: null,
	outcome: "unchanged",
	status: 0,
	statusText: NO_CHANGE_NEEDED_STATUS_TEXT,
});

const createFailedSettingResult = async (
	response: Response,
	fallbackMessage: string
): Promise<ManageSettingResult> => ({
	error: (await createGitHubError(response, fallbackMessage)).message,
	outcome: "failed",
	status: response.status,
	statusText: response.statusText,
});

const createRequestFailedSettingResult = (
	error: unknown,
	fallbackMessage: string
): ManageSettingResult => ({
	error: getErrorMessage(error, fallbackMessage),
	outcome: "failed",
	status: 0,
	statusText: "Request failed",
});

/** Maps a write response to "changed" on success or "failed" otherwise. */
const toSettingResult = async (
	response: Response,
	failureMessage: string
): Promise<ManageSettingResult> =>
	response.ok
		? {
				error: null,
				outcome: "changed",
				status: response.status,
				statusText: response.statusText,
			}
		: await createFailedSettingResult(response, failureMessage);

const getSubscriptionStateFromResponse = (
	subscription: GitHubSubscriptionResponse
): RepositorySubscriptionState => {
	if (subscription.ignored) {
		return "ignoring";
	}

	return subscription.subscribed ? "watching" : "unwatching";
};

/** A 404 means the viewer has no subscription record, which GitHub treats as not watching. */
const loadSubscriptionState = async (
	context: ManageContext,
	subscriptionPathname: string,
	repositoryName: string
): Promise<ManageSettingResult | RepositorySubscriptionState> => {
	const response = await fetchWithRateLimitRetry(context, () =>
		fetchGitHubResponse(context, subscriptionPathname)
	);

	if (response.status === 404) {
		return "unwatching";
	}

	if (!response.ok) {
		return createFailedSettingResult(
			response,
			`Failed to load the notification subscription for ${repositoryName}.`
		);
	}

	return getSubscriptionStateFromResponse(
		(await response.json()) as GitHubSubscriptionResponse
	);
};

const sendSubscriptionUpdate = (
	context: ManageContext,
	subscriptionPathname: string,
	targetState: RepositorySubscriptionState
): Promise<Response> =>
	fetchGitHubResponse(
		context,
		subscriptionPathname,
		targetState === "unwatching"
			? { method: "DELETE" }
			: jsonRequestInit("PUT", {
					ignored: targetState === "ignoring",
					subscribed: targetState === "watching",
				})
	);

const applySubscriptionAction = async (
	context: ManageContext,
	repositoryName: string,
	targetState: RepositorySubscriptionState
): Promise<ManageSettingResult> => {
	const subscriptionPathname = `${repositoryPathname(context.owner, repositoryName)}/subscription`;

	try {
		const currentState = await loadSubscriptionState(
			context,
			subscriptionPathname,
			repositoryName
		);

		if (typeof currentState !== "string") {
			return currentState;
		}

		if (currentState === targetState) {
			return createUnchangedSettingResult();
		}

		const updateResponse = await fetchWithRateLimitRetry(context, () =>
			sendSubscriptionUpdate(context, subscriptionPathname, targetState)
		);

		return await toSettingResult(
			updateResponse,
			`Failed to update notifications for ${repositoryName}.`
		);
	} catch (error) {
		return createRequestFailedSettingResult(
			error,
			"Notification update failed."
		);
	}
};

const createManageFailureResults = (
	wanted: WantedRepositorySettings,
	failedResult: ManageSettingResult
): RepositorySettingsResults => ({
	archive: wanted.archive ? failedResult : null,
	visibility: wanted.visibility ? { ...failedResult } : null,
});

/** Decides which settings still need a PATCH; settings already at their target are reported unchanged. */
const resolveRepositorySettingsBody = (
	actions: ManageRepositoryActions,
	current: GitHubManagedRepositoryResponse
): RepositorySettingsResults & { body: RepositorySettingsBody } => {
	const { archiveAction, visibilityAction } = actions;
	const body: RepositorySettingsBody = {};
	let archive: ManageSettingResult | null = null;
	let visibility: ManageSettingResult | null = null;

	if (archiveAction !== "current") {
		const targetArchived = archiveAction === "archived";

		if (current.archived === targetArchived) {
			archive = createUnchangedSettingResult();
		} else {
			body.archived = targetArchived;
		}
	}

	if (visibilityAction !== "current") {
		if (current.visibility === visibilityAction) {
			visibility = createUnchangedSettingResult();
		} else {
			body.visibility = visibilityAction;
		}
	}

	return { archive, body, visibility };
};

const loadManagedRepository = async (
	context: ManageContext,
	pathname: string,
	repositoryName: string
): Promise<GitHubManagedRepositoryResponse | ManageSettingResult> => {
	const response = await fetchWithRateLimitRetry(context, () =>
		fetchGitHubResponse(context, pathname)
	);

	if (!response.ok) {
		return createFailedSettingResult(
			response,
			`Failed to load ${context.owner}/${repositoryName}.`
		);
	}

	return (await response.json()) as GitHubManagedRepositoryResponse;
};

const applyRepositorySettings = async (
	context: ManageContext,
	repositoryName: string,
	actions: ManageRepositoryActions
): Promise<RepositorySettingsResults> => {
	const wanted: WantedRepositorySettings = {
		archive: actions.archiveAction !== "current",
		visibility: actions.visibilityAction !== "current",
	};

	if (!(wanted.archive || wanted.visibility)) {
		return { archive: null, visibility: null };
	}

	const pathname = repositoryPathname(context.owner, repositoryName);

	try {
		const current = await loadManagedRepository(
			context,
			pathname,
			repositoryName
		);

		if ("outcome" in current) {
			return createManageFailureResults(wanted, current);
		}

		const { archive, body, visibility } = resolveRepositorySettingsBody(
			actions,
			current
		);

		if (body.archived === undefined && body.visibility === undefined) {
			return { archive, visibility };
		}

		const patchResponse = await fetchWithRateLimitRetry(context, () =>
			fetchGitHubResponse(context, pathname, jsonRequestInit("PATCH", body))
		);
		const patchResult = await toSettingResult(
			patchResponse,
			`Failed to update ${repositoryName}.`
		);

		return {
			archive: body.archived === undefined ? archive : patchResult,
			visibility:
				body.visibility === undefined ? visibility : { ...patchResult },
		};
	} catch (error) {
		return createManageFailureResults(
			wanted,
			createRequestFailedSettingResult(
				error,
				"Repository settings update failed."
			)
		);
	}
};

const manageOneGitHubRepository = async (
	context: ManageContext,
	{ actions, repository }: ManageRepositoryChange
): Promise<ManageRepositoryResult> => {
	const { archive, visibility } = await applyRepositorySettings(
		context,
		repository,
		actions
	);
	const subscription =
		actions.subscriptionAction === "current"
			? null
			: await applySubscriptionAction(
					context,
					repository,
					actions.subscriptionAction
				);
	const ok = ![archive, subscription, visibility].some(
		(settingResult) => settingResult?.outcome === "failed"
	);

	return { archive, ok, repository, subscription, visibility };
};

export async function manageGitHubRepositories(
	accessToken: string,
	owner: string,
	changes: ManageRepositoryChange[],
	fetchImplementation: typeof fetch = fetch,
	options: ManageGitHubRepositoriesOptions = {}
): Promise<ManageRepositoryResult[]> {
	const context: ManageContext = {
		accessToken,
		fetchImplementation,
		maxRateLimitAttempts:
			options.maxRateLimitAttempts ?? DEFAULT_MANAGE_RATE_LIMIT_ATTEMPTS,
		owner,
		rateLimitDelayMs:
			options.rateLimitDelayMs ?? DEFAULT_MANAGE_RATE_LIMIT_DELAY_MS,
		sleep: options.sleep ?? sleep,
	};

	return await mapWithConcurrency(changes, MAX_MANAGE_CONCURRENCY, (change) =>
		manageOneGitHubRepository(context, change)
	);
}
