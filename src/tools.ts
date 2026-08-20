import { redirect } from "@tanstack/react-router";
import type { Colors } from "@/components/ui/button";
import { CONFIG } from "@/config";

export interface Tool {
	color: Colors;
	description: string;
	enabled: boolean;
	href: "/fame" | "/manage" | "/transfer";
	title: string;
}

export const TOOLS = {
	fame: {
		color: "amber",
		description:
			"See how your commits compare to your colleagues and who's doing more.",
		enabled: CONFIG.commitFame.enabled,
		href: "/fame",
		title: "Commit Fame",
	},
	manage: {
		color: "white",
		description:
			"Archive, change visibility, and set notification levels for many repositories at once.",
		enabled: CONFIG.bulkManageRepositories.enabled,
		href: "/manage",
		title: "Bulk Manage Repositories",
	},
	transfer: {
		color: "cyan",
		description:
			"Move your repositories in bulk between organizations and personal accounts.",
		enabled: CONFIG.bulkTransferRepositories.enabled,
		href: "/transfer",
		title: "Bulk Transfer Repositories",
	},
} as const satisfies Record<string, Tool>;

export const TOOL_LIST: Tool[] = [TOOLS.transfer, TOOLS.manage, TOOLS.fame];

/** Route options shared by every tool route: feature-flag redirect and head meta. */
export const createToolRouteOptions = (tool: Tool) => ({
	beforeLoad: () => {
		if (!tool.enabled) {
			throw redirect({ to: "/" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${tool.title} - Extra GitHub Tools` },
			{ content: tool.description, name: "description" },
		],
	}),
});
