import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	STATS_PENDING_REFRESH_MS,
	useStatsPendingRetry,
} from "./use-stats-pending-retry";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("useStatsPendingRetry", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("polls every 5 seconds until the attempt ceiling", async () => {
		const refresh = vi.fn(() => Promise.resolve());
		const { result } = renderHook(() =>
			useStatsPendingRetry({ enabled: true, refresh, targetKey: "o/r" })
		);

		for (let i = 0; i < 36; i += 1) {
			// biome-ignore lint/performance/noAwaitInLoops: each iteration must advance timers sequentially so the hook's effect reschedules its next setTimeout before the following advance.
			await act(async () => {
				await vi.advanceTimersByTimeAsync(STATS_PENDING_REFRESH_MS);
			});
		}

		expect(refresh).toHaveBeenCalledTimes(36);
		expect(result.current.attemptsExhausted).toBe(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(STATS_PENDING_REFRESH_MS * 3);
		});

		expect(refresh).toHaveBeenCalledTimes(36);
	});

	it("retryNow resets the ceiling and refreshes immediately", async () => {
		const refresh = vi.fn(() => Promise.resolve());
		const { result } = renderHook(() =>
			useStatsPendingRetry({ enabled: true, refresh, targetKey: "o/r" })
		);

		for (let i = 0; i < 36; i += 1) {
			// biome-ignore lint/performance/noAwaitInLoops: each iteration must advance timers sequentially so the hook's effect reschedules its next setTimeout before the following advance.
			await act(async () => {
				await vi.advanceTimersByTimeAsync(STATS_PENDING_REFRESH_MS);
			});
		}

		expect(result.current.attemptsExhausted).toBe(true);

		act(() => {
			result.current.retryNow();
		});

		expect(refresh).toHaveBeenCalledTimes(37);
		expect(result.current.attemptsExhausted).toBe(false);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(STATS_PENDING_REFRESH_MS);
		});

		expect(refresh).toHaveBeenCalledTimes(38);
	});

	it("does not poll when disabled", async () => {
		const refresh = vi.fn(() => Promise.resolve());
		const { result } = renderHook(() =>
			useStatsPendingRetry({ enabled: false, refresh, targetKey: "o/r" })
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(STATS_PENDING_REFRESH_MS * 5);
		});

		expect(refresh).toHaveBeenCalledTimes(0);
		expect(result.current.attemptsExhausted).toBe(false);
	});

	it("resets the counter when the target changes", async () => {
		const refresh = vi.fn(() => Promise.resolve());
		const { result, rerender } = renderHook(
			({ enabled, refresh: refreshFn, targetKey }) =>
				useStatsPendingRetry({ enabled, refresh: refreshFn, targetKey }),
			{
				initialProps: { enabled: true, refresh, targetKey: "o/a" },
			}
		);

		for (let i = 0; i < 36; i += 1) {
			// biome-ignore lint/performance/noAwaitInLoops: each iteration must advance timers sequentially so the hook's effect reschedules its next setTimeout before the following advance.
			await act(async () => {
				await vi.advanceTimersByTimeAsync(STATS_PENDING_REFRESH_MS);
			});
		}

		expect(result.current.attemptsExhausted).toBe(true);

		rerender({ enabled: true, refresh, targetKey: "o/b" });

		expect(result.current.attemptsExhausted).toBe(false);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(STATS_PENDING_REFRESH_MS);
		});

		expect(refresh).toHaveBeenCalledTimes(37);
	});
});
