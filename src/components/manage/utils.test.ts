import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

import { toast } from "sonner";
import type {
	GitHubRepository,
	ManageRepositoryActions,
	ManageRepositoryResult,
	ManageSettingResult,
	RepositoryVisibility,
} from "@/github/types";
import {
	getManageActionsSummary,
	getManageRepositoryStatus,
	getManageResultCounts,
	getManageResultDetails,
	getManageResultLabel,
	getManageVisibilityActionOptions,
	getManageVisibilityTargetOptions,
	getRepositoryChangeLines,
	getRepositoryStateActions,
	mergeStagedActions,
	showManageResultToast,
	stageChanges,
} from "./utils";

let nextRepositoryId = 1;

const createRepository = (
	overrides: Partial<GitHubRepository> = {}
): GitHubRepository => {
	nextRepositoryId += 1;

	const name = overrides.name ?? "repo";
	const visibility: RepositoryVisibility = overrides.visibility ?? "public";

	return {
		archived: false,
		fork: false,
		fullName: `owner/${name}`,
		htmlUrl: `https://github.com/owner/${name}`,
		id: nextRepositoryId,
		name,
		private: visibility !== "public",
		pushedAt: null,
		subscription: null,
		...overrides,
		visibility,
	};
};

const createSettingResult = (
	overrides: Partial<ManageSettingResult> = {}
): ManageSettingResult => ({
	error: null,
	outcome: "changed",
	status: 200,
	statusText: "OK",
	...overrides,
});

const createManageResult = (
	overrides: Partial<ManageRepositoryResult> = {}
): ManageRepositoryResult => ({
	archive: null,
	ok: true,
	repository: "repo",
	subscription: null,
	visibility: null,
	...overrides,
});

const createActions = (
	overrides: Partial<ManageRepositoryActions> = {}
): ManageRepositoryActions => ({
	archiveAction: "current",
	subscriptionAction: "current",
	visibilityAction: "current",
	...overrides,
});

describe("getManageResultCounts", () => {
	it("counts changed, unchanged, and failed results", () => {
		const results: ManageRepositoryResult[] = [
			createManageResult({ archive: createSettingResult() }),
			createManageResult({
				visibility: createSettingResult({ outcome: "unchanged" }),
			}),
			createManageResult({
				ok: false,
				subscription: createSettingResult({ outcome: "failed" }),
			}),
		];

		expect(getManageResultCounts(results)).toEqual({
			changedCount: 1,
			failedCount: 1,
			unchangedCount: 1,
		});
	});

	it("returns zero counts for an empty result list", () => {
		expect(getManageResultCounts([])).toEqual({
			changedCount: 0,
			failedCount: 0,
			unchangedCount: 0,
		});
	});
});

describe("getManageResultLabel", () => {
	it("labels a failed result", () => {
		expect(getManageResultLabel(createManageResult({ ok: false }))).toBe(
			"Failed"
		);
	});

	it("labels a result with a changed setting", () => {
		expect(
			getManageResultLabel(
				createManageResult({ subscription: createSettingResult() })
			)
		).toBe("Updated");
	});

	it("labels a result where nothing changed", () => {
		expect(
			getManageResultLabel(
				createManageResult({
					archive: createSettingResult({ outcome: "unchanged" }),
				})
			)
		).toBe("No change needed");
	});
});

describe("getManageResultDetails", () => {
	it("joins the requested settings in archive, visibility, subscription order", () => {
		const result = createManageResult({
			archive: createSettingResult(),
			ok: false,
			subscription: createSettingResult({
				error: "Resource not accessible",
				outcome: "failed",
				status: 403,
				statusText: "Forbidden",
			}),
			visibility: createSettingResult({ outcome: "unchanged" }),
		});

		expect(getManageResultDetails(result)).toBe(
			"Archived: updated; Visibility: no change needed; Notifications: failed (403 Forbidden — Resource not accessible)"
		);
	});

	it("falls back to the status text when a failure has no error message", () => {
		const result = createManageResult({
			ok: false,
			visibility: createSettingResult({
				outcome: "failed",
				status: 422,
				statusText: "Unprocessable Entity",
			}),
		});

		expect(getManageResultDetails(result)).toBe(
			"Visibility: failed (422 Unprocessable Entity)"
		);
	});

	it("reports when no setting was requested", () => {
		expect(getManageResultDetails(createManageResult())).toBe(
			"No settings requested."
		);
	});
});

describe("getManageActionsSummary", () => {
	it("returns an empty string when every action keeps the current value", () => {
		expect(getManageActionsSummary(createActions())).toBe("");
	});

	it("summarizes archiving, visibility, and notifications", () => {
		expect(
			getManageActionsSummary(
				createActions({
					archiveAction: "archived",
					subscriptionAction: "ignoring",
					visibilityAction: "private",
				})
			)
		).toBe("archive; make private; ignore notifications");
	});

	it("summarizes unarchiving, internal visibility, and unwatching", () => {
		expect(
			getManageActionsSummary(
				createActions({
					archiveAction: "unarchived",
					subscriptionAction: "unwatching",
					visibilityAction: "internal",
				})
			)
		).toBe("unarchive; make internal; stop watching");
	});

	it("summarizes watching all activity and public visibility", () => {
		expect(
			getManageActionsSummary(
				createActions({
					subscriptionAction: "watching",
					visibilityAction: "public",
				})
			)
		).toBe("make public; watch all activity");
	});
});

describe("getRepositoryChangeLines", () => {
	it("returns no lines when every action keeps the current value", () => {
		expect(
			getRepositoryChangeLines(createRepository(), createActions())
		).toEqual([]);
	});

	it("lists every field that changes", () => {
		const repository = createRepository({
			archived: false,
			name: "repo",
			subscription: "watching",
			visibility: "private",
		});

		expect(
			getRepositoryChangeLines(
				repository,
				createActions({
					archiveAction: "archived",
					subscriptionAction: "ignoring",
					visibilityAction: "public",
				})
			)
		).toEqual([
			"Archived: no → yes",
			"Visibility: private → public",
			"Notifications: watching → ignoring",
		]);
	});

	it("reports unarchiving from the current state", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({ archived: true, name: "repo" }),
				createActions({ archiveAction: "unarchived" })
			)
		).toEqual(["Archived: yes → no"]);
	});

	it("omits the archive line when the repository already matches", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({ archived: true, name: "repo" }),
				createActions({ archiveAction: "archived" })
			)
		).toEqual([]);
	});

	it("omits the visibility line when the repository already matches", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({ name: "repo", visibility: "private" }),
				createActions({ visibilityAction: "private" })
			)
		).toEqual([]);
	});

	it("labels the unwatching action as not watching", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({ name: "repo", subscription: "watching" }),
				createActions({ subscriptionAction: "unwatching" })
			)
		).toEqual(["Notifications: watching → not watching"]);
	});

	it("reads the current notification state from the repository", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({ name: "repo", subscription: "unwatching" }),
				createActions({ subscriptionAction: "watching" })
			)
		).toEqual(["Notifications: not watching → watching"]);
	});

	it("omits the notification line when the subscription already matches", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({ name: "repo", subscription: "unwatching" }),
				createActions({ subscriptionAction: "unwatching" })
			)
		).toEqual([]);
	});

	it("states the notification target without a before state when the subscription is unknown", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({ name: "repo" }),
				createActions({ subscriptionAction: "unwatching" })
			)
		).toEqual(["Notifications: set to not watching"]);
	});

	it("keeps the other lines comparable when the subscription is unknown", () => {
		expect(
			getRepositoryChangeLines(
				createRepository({
					archived: true,
					name: "repo",
					visibility: "private",
				}),
				createActions({
					archiveAction: "archived",
					subscriptionAction: "ignoring",
					visibilityAction: "public",
				})
			)
		).toEqual([
			"Visibility: private → public",
			"Notifications: set to ignoring",
		]);
	});

	it("returns no lines for an unknown subscription when notifications keep the current value", () => {
		expect(
			getRepositoryChangeLines(createRepository(), createActions())
		).toEqual([]);
	});
});

describe("getManageVisibilityActionOptions", () => {
	it("omits internal when the account does not support it", () => {
		expect(
			getManageVisibilityActionOptions(false).map((option) => option.value)
		).toEqual(["current", "public", "private"]);
	});

	it("includes internal when the account supports it", () => {
		expect(
			getManageVisibilityActionOptions(true).map((option) => option.value)
		).toEqual(["current", "public", "private", "internal"]);
	});
});

describe("getManageVisibilityTargetOptions", () => {
	it("omits keep current and internal when the account does not support it", () => {
		expect(
			getManageVisibilityTargetOptions(false).map((option) => option.value)
		).toEqual(["public", "private"]);
	});

	it("includes internal when the account supports it", () => {
		expect(
			getManageVisibilityTargetOptions(true).map((option) => option.value)
		).toEqual(["public", "private", "internal"]);
	});
});

describe("getManageRepositoryStatus", () => {
	it("returns 'pending' when the pending set wins over a result", () => {
		expect(
			getManageRepositoryStatus(
				"repo",
				new Set(["repo"]),
				new Map([["repo", createManageResult()]])
			)
		).toBe("pending");
	});

	it("returns 'idle' when there is no result", () => {
		expect(getManageRepositoryStatus("repo", new Set(), new Map())).toBe(
			"idle"
		);
	});

	it("returns 'updated' when a setting changed", () => {
		expect(
			getManageRepositoryStatus(
				"repo",
				new Set(),
				new Map([
					["repo", createManageResult({ archive: createSettingResult() })],
				])
			)
		).toBe("updated");
	});

	it("returns 'unchanged' when nothing changed", () => {
		expect(
			getManageRepositoryStatus(
				"repo",
				new Set(),
				new Map([
					[
						"repo",
						createManageResult({
							archive: createSettingResult({ outcome: "unchanged" }),
						}),
					],
				])
			)
		).toBe("unchanged");
	});

	it("returns 'failed' when the result is not ok", () => {
		expect(
			getManageRepositoryStatus(
				"repo",
				new Set(),
				new Map([["repo", createManageResult({ ok: false })]])
			)
		).toBe("failed");
	});
});

describe("showManageResultToast", () => {
	it("shows the run error on its own when nothing was collected", () => {
		vi.clearAllMocks();

		showManageResultToast([], "Failed to update repositories.");

		expect(toast.error).toHaveBeenCalledWith("Failed to update repositories.");
	});

	it("shows the run error with the collected counts", () => {
		vi.clearAllMocks();

		showManageResultToast(
			[createManageResult({ archive: createSettingResult() })],
			"Failed to update repositories."
		);

		expect(toast.error).toHaveBeenCalledWith(
			"Failed to update repositories. 1 repository updated before the run stopped."
		);
	});

	it("shows a success toast for updated repositories", () => {
		vi.clearAllMocks();

		showManageResultToast(
			[
				createManageResult({ archive: createSettingResult() }),
				createManageResult({ visibility: createSettingResult() }),
			],
			null
		);

		expect(toast.success).toHaveBeenCalledWith("2 repositories updated.");
	});

	it("shows a success toast when no change was needed", () => {
		vi.clearAllMocks();

		showManageResultToast(
			[
				createManageResult({
					archive: createSettingResult({ outcome: "unchanged" }),
				}),
			],
			null
		);

		expect(toast.success).toHaveBeenCalledWith("No changes were needed.");
	});

	it("shows an error toast for failed repositories", () => {
		vi.clearAllMocks();

		showManageResultToast(
			[
				createManageResult({ archive: createSettingResult() }),
				createManageResult({ ok: false }),
			],
			null
		);

		expect(toast.error).toHaveBeenCalledWith("1 repository failed to update.");
	});
});

describe("getRepositoryStateActions", () => {
	it("maps the current state to action values", () => {
		const repository = createRepository({
			archived: true,
			subscription: "watching",
			visibility: "private",
		});

		expect(getRepositoryStateActions(repository)).toEqual({
			archiveAction: "archived",
			subscriptionAction: "watching",
			visibilityAction: "private",
		});
	});

	it("leaves an unknown subscription as current", () => {
		expect(
			getRepositoryStateActions(createRepository({ subscription: null }))
				.subscriptionAction
		).toBe("current");
	});
});

describe("mergeStagedActions", () => {
	it("stages a setting that differs from the current state", () => {
		const repository = createRepository({ visibility: "public" });

		expect(
			mergeStagedActions(repository, undefined, { visibilityAction: "private" })
		).toEqual({
			archiveAction: "current",
			subscriptionAction: "current",
			visibilityAction: "private",
		});
	});

	it("keeps earlier staged settings when another is added", () => {
		const repository = createRepository({ archived: false });
		const staged = mergeStagedActions(repository, undefined, {
			visibilityAction: "private",
		});

		expect(
			mergeStagedActions(repository, staged ?? undefined, {
				archiveAction: "archived",
			})
		).toEqual({
			archiveAction: "archived",
			subscriptionAction: "current",
			visibilityAction: "private",
		});
	});

	it("returns null when the change restores the current state", () => {
		const repository = createRepository({ visibility: "public" });
		const staged = mergeStagedActions(repository, undefined, {
			visibilityAction: "private",
		});

		expect(
			mergeStagedActions(repository, staged ?? undefined, {
				visibilityAction: "public",
			})
		).toBeNull();
	});
});

describe("stageChanges", () => {
	it("adds, replaces, and removes entries per repository", () => {
		const alpha = createRepository({ name: "alpha", visibility: "public" });
		const beta = createRepository({ name: "beta", visibility: "private" });
		const staged = stageChanges(new Map(), [alpha, beta], {
			visibilityAction: "private",
		});

		expect([...staged.keys()]).toEqual(["alpha"]);

		const reverted = stageChanges(staged, [alpha], {
			visibilityAction: "public",
		});

		expect(reverted.size).toBe(0);
	});

	it("keeps untouched entries by identity", () => {
		const alpha = createRepository({ archived: false, name: "alpha" });
		const beta = createRepository({ archived: false, name: "beta" });
		const staged = stageChanges(new Map(), [alpha], {
			archiveAction: "archived",
		});
		const next = stageChanges(staged, [beta], { archiveAction: "archived" });

		expect(next.get("alpha")).toBe(staged.get("alpha"));
		expect(next.size).toBe(2);
	});
});
