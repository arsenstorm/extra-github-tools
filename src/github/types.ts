const CONTRIBUTOR_STATS_PENDING_MESSAGE =
	"GitHub is still calculating contributor statistics. Please try again in a moment.";

export const TRANSFER_REPOSITORY_ARCHIVE_STATES = [
	"current",
	"archived",
	"unarchived",
] as const;
export const TRANSFER_REPOSITORY_VISIBILITIES = [
	"current",
	"private",
	"public",
] as const;

export const MANAGE_REPOSITORY_ARCHIVE_ACTIONS = [
	"current",
	"archived",
	"unarchived",
] as const;
export const MANAGE_REPOSITORY_VISIBILITY_ACTIONS = [
	"current",
	"public",
	"private",
	"internal",
] as const;
export const MANAGE_REPOSITORY_SUBSCRIPTION_ACTIONS = [
	"current",
	"watching",
	"unwatching",
	"ignoring",
] as const;

export interface GitHubViewer {
	avatarUrl: string;
	htmlUrl: string;
	id: number;
	login: string;
	name: string | null;
}

export interface GitHubAccount {
	avatar: string;
	handle: string;
	id: number;
}

export type RepositoryVisibility = "internal" | "private" | "public";

export interface GitHubRepository {
	archived: boolean;
	fork: boolean;
	fullName: string;
	htmlUrl: string;
	id: number;
	name: string;
	private: boolean;
	pushedAt: string | null;
	/** The viewer's notification subscription, or null when unknown. */
	subscription: RepositorySubscriptionState | null;
	visibility: RepositoryVisibility;
}

export interface TransferRepositoryResult {
	error: string | null;
	newName: string;
	ok: boolean;
	postTransferSettings?: TransferRepositorySettingsResult;
	repository: string;
	status: number;
	statusText: string;
}

export type TransferRepositoryArchiveState =
	(typeof TRANSFER_REPOSITORY_ARCHIVE_STATES)[number];

export type TransferRepositoryVisibility =
	(typeof TRANSFER_REPOSITORY_VISIBILITIES)[number];

export interface TransferRepositorySettingsResult {
	error: string | null;
	ok: boolean;
	status: number;
	statusText: string;
}

export type ManageRepositoryArchiveAction =
	(typeof MANAGE_REPOSITORY_ARCHIVE_ACTIONS)[number];
export type ManageRepositoryVisibilityAction =
	(typeof MANAGE_REPOSITORY_VISIBILITY_ACTIONS)[number];
export type ManageRepositorySubscriptionAction =
	(typeof MANAGE_REPOSITORY_SUBSCRIPTION_ACTIONS)[number];
export type RepositorySubscriptionState = Exclude<
	ManageRepositorySubscriptionAction,
	"current"
>;

export interface ManageRepositoryActions {
	archiveAction: ManageRepositoryArchiveAction;
	subscriptionAction: ManageRepositorySubscriptionAction;
	visibilityAction: ManageRepositoryVisibilityAction;
}

export interface ManageRepositoryChange {
	actions: ManageRepositoryActions;
	repository: string;
}

export type ManageSettingOutcome = "changed" | "failed" | "unchanged";

export interface ManageSettingResult {
	error: string | null;
	outcome: ManageSettingOutcome;
	status: number;
	statusText: string;
}

export interface ManageRepositoryResult {
	archive: ManageSettingResult | null;
	ok: boolean;
	repository: string;
	subscription: ManageSettingResult | null;
	visibility: ManageSettingResult | null;
}

export interface ManageGitHubRepositoriesOptions {
	maxRateLimitAttempts?: number;
	rateLimitDelayMs?: number;
	sleep?: (durationMs: number) => Promise<void>;
}

export interface ContributorStats {
	activeWeeks: number;
	additions: number;
	commits: number;
	deletions: number;
	email: string;
	name: string;
	percentage: number;
}

export interface RepoStats {
	contributors: ContributorStats[];
	totalAdditions: number;
	totalCommits: number;
	totalDeletions: number;
	totalFiles: number;
	totalLines: number;
}

export interface AnalyzeGitHubRepositoryOptions {
	contributorStatsDelayMs?: number;
	fetchImplementation?: typeof fetch;
	maxContributorStatsAttempts?: number;
	sleep?: (durationMs: number) => Promise<void>;
}

export class GitHubContributorStatsPendingError extends Error {
	constructor(owner: string, repositoryName: string) {
		super(
			`${CONTRIBUTOR_STATS_PENDING_MESSAGE} GitHub may need more time for ${owner}/${repositoryName}.`
		);
		this.name = "GitHubContributorStatsPendingError";
	}
}

export const isGitHubContributorStatsPendingError = (
	error: unknown
): error is GitHubContributorStatsPendingError =>
	error instanceof GitHubContributorStatsPendingError;

export interface TransferGitHubRepositoriesOptions {
	archiveState?: TransferRepositoryArchiveState;
	maxSettingsUpdateAttempts?: number;
	namePrefix?: string;
	nameSuffix?: string;
	settingsUpdateDelayMs?: number;
	sleep?: (durationMs: number) => Promise<void>;
	visibility?: TransferRepositoryVisibility;
}
