import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

import { toast } from "sonner";
import type { TransferRepositoryResult } from "@/github";
import type { TransferRepositoriesResult } from "@/server-functions";
import type { RepositoryTransferOptions } from "./types";
import {
	getPostTransferSettingsSummary,
	getRepositoryStatus,
	getTransferResultCounts,
	getTransferredRepositoryName,
	showTransferResultToast,
} from "./utils";

const createTransferResult = (
	overrides: Partial<TransferRepositoryResult> = {}
): TransferRepositoryResult => ({
	error: null,
	newName: "repo",
	ok: true,
	repository: "repo",
	status: 200,
	statusText: "OK",
	...overrides,
});

describe("getRepositoryStatus", () => {
	it("returns 'pending' when the pending set wins over a result", () => {
		const pendingRepositories = new Set(["repo"]);
		const resultsByRepository = new Map([
			["repo", createTransferResult({ ok: true })],
		]);

		expect(
			getRepositoryStatus("repo", pendingRepositories, resultsByRepository)
		).toBe("pending");
	});

	it("returns 'idle' when there is no result", () => {
		expect(getRepositoryStatus("repo", new Set(), new Map())).toBe("idle");
	});

	it("returns 'transferred' when the result is ok", () => {
		const resultsByRepository = new Map([
			["repo", createTransferResult({ ok: true })],
		]);

		expect(getRepositoryStatus("repo", new Set(), resultsByRepository)).toBe(
			"transferred"
		);
	});

	it("returns 'failed' when the result is not ok", () => {
		const resultsByRepository = new Map([
			["repo", createTransferResult({ ok: false })],
		]);

		expect(getRepositoryStatus("repo", new Set(), resultsByRepository)).toBe(
			"failed"
		);
	});
});

describe("getTransferredRepositoryName / getPostTransferSettingsSummary", () => {
	it("applies the name prefix and suffix", () => {
		expect(
			getTransferredRepositoryName("repo", {
				namePrefix: "x-",
				nameSuffix: "-y",
			})
		).toBe("x-repo-y");
	});

	it("summarizes keeping the current visibility and archive state", () => {
		const transferOptions: RepositoryTransferOptions = {
			archiveState: "current",
			namePrefix: "",
			nameSuffix: "",
			visibility: "current",
		};

		expect(getPostTransferSettingsSummary(transferOptions)).toBe(
			"keep current visibility and archive state"
		);
	});

	it("summarizes making private and archiving", () => {
		const transferOptions: RepositoryTransferOptions = {
			archiveState: "archived",
			namePrefix: "",
			nameSuffix: "",
			visibility: "private",
		};

		expect(getPostTransferSettingsSummary(transferOptions)).toBe(
			"make private; archive"
		);
	});

	it("summarizes making public and unarchiving", () => {
		const transferOptions: RepositoryTransferOptions = {
			archiveState: "unarchived",
			namePrefix: "",
			nameSuffix: "",
			visibility: "public",
		};

		expect(getPostTransferSettingsSummary(transferOptions)).toBe(
			"make public; unarchive"
		);
	});
});

describe("getTransferResultCounts", () => {
	it("counts transferred, failed, and settings-failed results", () => {
		const results: TransferRepositoryResult[] = [
			createTransferResult({ ok: true }),
			createTransferResult({
				ok: true,
				postTransferSettings: {
					error: null,
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
				},
			}),
			createTransferResult({ ok: false }),
		];

		const result: TransferRepositoriesResult = {
			error: null,
			results,
			success: false,
		};

		expect(getTransferResultCounts(result)).toEqual({
			failedCount: 1,
			settingsFailedCount: 1,
			transferredCount: 2,
		});
	});

	it("returns all zeros when results is null", () => {
		const result: TransferRepositoriesResult = {
			error: null,
			results: null,
			success: false,
		};

		expect(getTransferResultCounts(result)).toEqual({
			failedCount: 0,
			settingsFailedCount: 0,
			transferredCount: 0,
		});
	});
});

describe("showTransferResultToast", () => {
	it("shows a success toast for a single transferred repository", () => {
		vi.clearAllMocks();

		const result: TransferRepositoriesResult = {
			error: null,
			results: [createTransferResult({ ok: true })],
			success: true,
		};

		showTransferResultToast(result);

		expect(toast.success).toHaveBeenCalledWith("1 repository transferred.");
	});

	it("shows a success toast for multiple transferred repositories", () => {
		vi.clearAllMocks();

		const result: TransferRepositoriesResult = {
			error: null,
			results: [
				createTransferResult({ ok: true }),
				createTransferResult({ ok: true }),
			],
			success: true,
		};

		showTransferResultToast(result);

		expect(toast.success).toHaveBeenCalledWith("2 repositories transferred.");
	});

	it("shows an error toast with failed and settings-failed counts", () => {
		vi.clearAllMocks();

		const result: TransferRepositoriesResult = {
			error: null,
			results: [
				createTransferResult({
					ok: true,
					postTransferSettings: {
						error: null,
						ok: false,
						status: 500,
						statusText: "Internal Server Error",
					},
				}),
				createTransferResult({ ok: false }),
			],
			success: false,
		};

		showTransferResultToast(result);

		expect(toast.error).toHaveBeenCalledWith(
			"1 repository failed to transfer; 1 settings update failed."
		);
	});

	it("shows the error message when results is null", () => {
		vi.clearAllMocks();

		const result: TransferRepositoriesResult = {
			error: "boom",
			results: null,
			success: false,
		};

		showTransferResultToast(result);

		expect(toast.error).toHaveBeenCalledWith("boom");
	});

	it("shows a default error message when results and error are null", () => {
		vi.clearAllMocks();

		const result: TransferRepositoriesResult = {
			error: null,
			results: null,
			success: false,
		};

		showTransferResultToast(result);

		expect(toast.error).toHaveBeenCalledWith(
			"Failed to transfer repositories."
		);
	});
});
