const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_USER_AGENT = "extra-github-tools";
const GITHUB_LIST_PAGE_SIZE = 100;
const MAX_PAGINATION_CONCURRENCY = 5;
const MAX_RETRY_AFTER_DELAY_MS = 5000;
const LAST_PAGE_LINK_PATTERN = /[?&]page=(\d+)[^>]*>;\s*rel="last"/;

export type Sleep = (durationMs: number) => Promise<void>;

export interface GitHubRequestContext {
	accessToken: string;
	fetchImplementation: typeof fetch;
}

export const createRequestContext = (
	accessToken: string,
	fetchImplementation: typeof fetch = fetch
): GitHubRequestContext => ({ accessToken, fetchImplementation });

export const sleep: Sleep = async (durationMs) =>
	new Promise((resolve) => {
		setTimeout(resolve, durationMs);
	});

export const getErrorMessage = (
	error: unknown,
	fallbackMessage: string
): string => (error instanceof Error ? error.message : fallbackMessage);

export const repositoryPathname = (
	owner: string,
	repositoryName: string
): string =>
	`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}`;

export const jsonRequestInit = (
	method: "PATCH" | "POST" | "PUT",
	body: unknown
): RequestInit => ({
	body: JSON.stringify(body),
	headers: { "Content-Type": "application/json" },
	method,
});

/** Runs `mapper` over `items` with at most `concurrency` calls in flight, preserving order. */
export const mapWithConcurrency = async <Item, Result>(
	items: Item[],
	concurrency: number,
	mapper: (item: Item) => Promise<Result>
): Promise<Result[]> => {
	const results: Result[] = new Array(items.length);
	let nextIndex = 0;

	const runWorker = async (): Promise<void> => {
		while (nextIndex < items.length) {
			const index = nextIndex;

			nextIndex += 1;
			// biome-ignore lint/performance/noAwaitInLoops: each worker processes its slice sequentially; concurrency comes from running several workers
			results[index] = await mapper(items[index] as Item);
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
	);

	return results;
};

const createGitHubHeaders = (
	accessToken: string,
	initialHeaders?: HeadersInit
): Headers => {
	const headers = new Headers(initialHeaders);

	headers.set("Accept", "application/vnd.github+json");
	headers.set("Authorization", `Bearer ${accessToken}`);
	headers.set("User-Agent", GITHUB_USER_AGENT);
	headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);

	return headers;
};

export const createGitHubError = async (
	response: Response,
	fallbackMessage: string
): Promise<Error> => {
	const errorText = (await response.text()).trim();

	return new Error(
		errorText ? `${fallbackMessage} ${errorText}` : fallbackMessage
	);
};

export const fetchGitHubResponse = (
	context: GitHubRequestContext,
	pathname: string,
	initialRequest?: RequestInit
): Promise<Response> => {
	// Call fetch unbound: invoking it as `context.fetchImplementation(...)`
	// passes `context` as `this`, which Workers rejects as an illegal invocation.
	const { accessToken, fetchImplementation } = context;

	return fetchImplementation(`${GITHUB_API_URL}${pathname}`, {
		...initialRequest,
		cache: "no-store",
		headers: createGitHubHeaders(accessToken, initialRequest?.headers),
	});
};

const readJsonOrThrow = async <ResponseData>(
	response: Response,
	fallbackMessage: string
): Promise<ResponseData> => {
	if (!response.ok) {
		throw await createGitHubError(response, fallbackMessage);
	}

	return (await response.json()) as ResponseData;
};

export const fetchGitHubJson = async <ResponseData>(
	context: GitHubRequestContext,
	pathname: string,
	fallbackMessage: string,
	initialRequest?: RequestInit
): Promise<ResponseData> =>
	readJsonOrThrow<ResponseData>(
		await fetchGitHubResponse(context, pathname, initialRequest),
		fallbackMessage
	);

/** Honors a Retry-After header (seconds or HTTP date), capped so a slow hint can't stall a request. */
export const getRetryAfterDelayMs = (
	response: Response,
	defaultDelayMs: number
): number => {
	const retryAfter = response.headers.get("Retry-After");

	if (!retryAfter) {
		return defaultDelayMs;
	}

	const retryAfterSeconds = Number(retryAfter);

	if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
		return Math.min(retryAfterSeconds * 1000, MAX_RETRY_AFTER_DELAY_MS);
	}

	const retryAfterDate = Date.parse(retryAfter);

	if (!Number.isNaN(retryAfterDate)) {
		return Math.min(
			Math.max(retryAfterDate - Date.now(), 0),
			MAX_RETRY_AFTER_DELAY_MS
		);
	}

	return defaultDelayMs;
};

export const createGitHubPaginatedPathname = (
	pathname: string,
	page: number
): string => {
	const paginationParams = new URLSearchParams({
		page: String(page),
		per_page: String(GITHUB_LIST_PAGE_SIZE),
	});
	const separator = pathname.includes("?") ? "&" : "?";

	return `${pathname}${separator}${paginationParams.toString()}`;
};

const getLastPageFromLinkHeader = (response: Response): number | null => {
	const match = response.headers.get("Link")?.match(LAST_PAGE_LINK_PATTERN);
	const lastPage = match ? Number(match[1]) : Number.NaN;

	return Number.isInteger(lastPage) && lastPage > 1 ? lastPage : null;
};

const fetchPage = async <ResponseData>(
	context: GitHubRequestContext,
	pathname: string,
	page: number,
	fallbackMessage: string
): Promise<ResponseData[]> =>
	readJsonOrThrow<ResponseData[]>(
		await fetchGitHubResponse(
			context,
			createGitHubPaginatedPathname(pathname, page)
		),
		fallbackMessage
	);

const fetchKnownPages = <ResponseData>(
	context: GitHubRequestContext,
	pathname: string,
	lastPage: number,
	fallbackMessage: string
): Promise<ResponseData[][]> => {
	const remainingPages = Array.from(
		{ length: lastPage - 1 },
		(_item, index) => index + 2
	);

	return mapWithConcurrency(
		remainingPages,
		MAX_PAGINATION_CONCURRENCY,
		(page) => fetchPage<ResponseData>(context, pathname, page, fallbackMessage)
	);
};

const fetchPagesUntilShort = async <ResponseData>(
	context: GitHubRequestContext,
	pathname: string,
	fallbackMessage: string
): Promise<ResponseData[][]> => {
	const pages: ResponseData[][] = [];

	for (let page = 2; ; page += 1) {
		// biome-ignore lint/performance/noAwaitInLoops: without a Link header the list length is unknown, so pages are fetched in order until a short page ends it
		const pageResults = await fetchPage<ResponseData>(
			context,
			pathname,
			page,
			fallbackMessage
		);

		pages.push(pageResults);

		if (pageResults.length < GITHUB_LIST_PAGE_SIZE) {
			return pages;
		}
	}
};

/**
 * Reads every page of a list endpoint. Pass `firstResponse` when the caller
 * already fetched page 1 (for example to inspect its status first).
 */
export const fetchGitHubPaginatedJson = async <ResponseData>(
	context: GitHubRequestContext,
	pathname: string,
	fallbackMessage: string,
	firstResponse?: Response
): Promise<ResponseData[]> => {
	const firstPageResults = await readJsonOrThrow<ResponseData[]>(
		firstResponse ??
			(await fetchGitHubResponse(
				context,
				createGitHubPaginatedPathname(pathname, 1)
			)),
		fallbackMessage
	);

	if (firstPageResults.length < GITHUB_LIST_PAGE_SIZE) {
		return firstPageResults;
	}

	const lastPage = getLastPageFromLinkHeader(
		firstResponse ?? new Response(null)
	);
	const remainingPages = lastPage
		? await fetchKnownPages<ResponseData>(
				context,
				pathname,
				lastPage,
				fallbackMessage
			)
		: await fetchPagesUntilShort<ResponseData>(
				context,
				pathname,
				fallbackMessage
			);

	return [firstPageResults, ...remainingPages].flat();
};
