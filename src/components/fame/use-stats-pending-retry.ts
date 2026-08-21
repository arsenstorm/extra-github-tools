import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** GitHub usually finishes computing statistics well within three minutes. */
export const STATS_PENDING_MAX_ATTEMPTS = 36;
export const STATS_PENDING_REFRESH_MS = 5000;

export interface StatsPendingRetry {
	/** True once the automatic retries are used up and polling has stopped. */
	attemptsExhausted: boolean;
	/** Restarts polling from zero and refreshes immediately. */
	retryNow: () => void;
}

const reportRefreshError = (error: unknown): void => {
	toast.error(
		error instanceof Error
			? error.message
			: "Failed to refresh repository statistics."
	);
};

/**
 * Polls `refresh` while `enabled`, at most `STATS_PENDING_MAX_ATTEMPTS` times.
 * The attempt counter resets whenever `targetKey` changes (a new repository).
 */
export const useStatsPendingRetry = ({
	enabled,
	refresh,
	targetKey,
}: {
	enabled: boolean;
	refresh: () => Promise<void>;
	targetKey: string;
}): StatsPendingRetry => {
	const [attempts, setAttempts] = useState(0);
	const [trackedKey, setTrackedKey] = useState(targetKey);

	if (trackedKey !== targetKey) {
		setTrackedKey(targetKey);
		setAttempts(0);
	}

	const attemptsExhausted = attempts >= STATS_PENDING_MAX_ATTEMPTS;

	useEffect(() => {
		if (!enabled || attempts >= STATS_PENDING_MAX_ATTEMPTS) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setAttempts((count) => count + 1);
			refresh().catch(reportRefreshError);
		}, STATS_PENDING_REFRESH_MS);

		return () => window.clearTimeout(timeoutId);
	}, [attempts, enabled, refresh]);

	const retryNow = useCallback(() => {
		setAttempts(0);
		refresh().catch(reportRefreshError);
	}, [refresh]);

	return { attemptsExhausted: enabled && attemptsExhausted, retryNow };
};
