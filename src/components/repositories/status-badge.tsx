import { Text } from "@/components/ui/text";
import { RepositoryBadge, type RepositoryStatusTone } from "./badge";

export interface StatusBadgeStyle {
	label: string;
	/** Omit for the neutral badge. */
	tone?: RepositoryStatusTone;
}

/** Shows a row's run status; "idle" rows read "Not queued" as plain text. */
export function RepositoryStatusBadge<Status extends string>({
	badges,
	status,
}: Readonly<{
	badges: Record<Exclude<Status, "idle">, StatusBadgeStyle>;
	status: Status | "idle";
}>) {
	if (status === "idle") {
		return <Text>Not queued</Text>;
	}

	const { label, tone } = badges[status as Exclude<Status, "idle">];

	return <RepositoryBadge tone={tone}>{label}</RepositoryBadge>;
}
