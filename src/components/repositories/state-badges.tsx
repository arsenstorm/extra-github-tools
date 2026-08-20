import type {
	RepositorySubscriptionState,
	RepositoryVisibility,
} from "@/github/types";
import { RepositoryBadge, type RepositoryBadgeTone } from "./badge";

export interface StateBadgeStyle {
	label: string;
	/** Omit for the neutral badge. */
	tone?: RepositoryBadgeTone;
}

export const VISIBILITY_BADGES: Record<RepositoryVisibility, StateBadgeStyle> =
	{
		internal: { label: "Internal", tone: "pending" },
		private: { label: "Private", tone: "accent" },
		public: { label: "Public", tone: "success" },
	};

export const ARCHIVED_BADGE: StateBadgeStyle = {
	label: "Archived",
	tone: "pending",
};
export const ACTIVE_BADGE: StateBadgeStyle = { label: "Active" };
export const FORK_BADGE: StateBadgeStyle = { label: "Fork", tone: "info" };

export const SUBSCRIPTION_BADGES: Record<
	RepositorySubscriptionState,
	StateBadgeStyle
> = {
	ignoring: { label: "Ignoring", tone: "failed" },
	unwatching: { label: "Not watching" },
	watching: { label: "Watching", tone: "info" },
};

export const getArchivedBadge = (archived: boolean): StateBadgeStyle =>
	archived ? ARCHIVED_BADGE : ACTIVE_BADGE;

/** A badge for one repository state (visibility, archived, notifications). */
export function StateBadge({
	badge,
	className,
}: Readonly<{
	badge: StateBadgeStyle;
	className?: string;
}>) {
	return (
		<RepositoryBadge className={className} tone={badge.tone}>
			{badge.label}
		</RepositoryBadge>
	);
}
