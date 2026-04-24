"use client";

import {
	ArrowRightStartOnRectangleIcon,
	Cog8ToothIcon,
	UserIcon,
} from "@heroicons/react/16/solid";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAppSession } from "@/app-session";
import { signOutUser, startGitHubSignIn } from "@/auth-actions";
import { Avatar } from "@/components/ui/avatar";
import {
	Dropdown,
	DropdownButton,
	DropdownDivider,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from "@/components/ui/dropdown";
import {
	Navbar,
	NavbarItem,
	NavbarSection,
	NavbarSpacer,
} from "@/components/ui/navbar";
import {
	Sidebar,
	SidebarBody,
	SidebarItem,
	SidebarSection,
} from "@/components/ui/sidebar";
import { StackedLayout } from "@/components/ui/stacked-layout";
import { CONFIG } from "@/config.ts";

const navItems: { enabled?: boolean; label: string; to: string }[] = [
	{ label: "Dashboard", to: "/" as const },
	{
		enabled: CONFIG.bulkTransferRepositories.enabled,
		label: "Bulk Transfer Repositories",
		to: "/transfer" as const,
	},
	{
		enabled: CONFIG.commitFame.enabled,
		label: "Commit Fame",
		to: "/fame" as const,
	},
] as const;

const isCurrentPath = (pathname: string, targetPath: string): boolean =>
	targetPath === "/"
		? pathname === "/"
		: pathname === targetPath || pathname.startsWith(`${targetPath}/`);

function SignOutButton() {
	return (
		<DropdownItem
			onClick={async () => {
				const { error } = await signOutUser();

				if (error) {
					toast.error("Failed to sign out. Please try again.");
					return;
				}

				window.location.assign("/");
			}}
		>
			<ArrowRightStartOnRectangleIcon />
			<DropdownLabel>Sign out</DropdownLabel>
		</DropdownItem>
	);
}

function SignInMenuItem() {
	return (
		<DropdownItem
			onClick={async () => {
				const { error } = await startGitHubSignIn(
					typeof window === "undefined"
						? "/"
						: `${window.location.pathname}${window.location.search}${window.location.hash}`
				);

				if (error) {
					toast.error("Failed to start GitHub sign-in.");
				}
			}}
		>
			<UserIcon />
			<DropdownLabel>Sign in with GitHub</DropdownLabel>
		</DropdownItem>
	);
}

export function Navigation({
	children,
}: {
	readonly children: React.ReactNode;
}): React.ReactNode {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const { github, githubClientId, session } = useAppSession();

	const avatarSource = github?.viewer?.avatarUrl ?? session?.user.image;
	const avatarInitial =
		github?.viewer?.login?.slice(0, 1).toUpperCase() ??
		session?.user.name?.slice(0, 1).toUpperCase() ??
		session?.user.email?.slice(0, 1).toUpperCase() ??
		"?";
	const gitHubInstallationSettingsUrl = githubClientId
		? `https://github.com/settings/connections/applications/${githubClientId}`
		: null;

	return (
		<StackedLayout
			navbar={
				<Navbar>
					<NavbarSection className="max-lg:hidden">
						{navItems
							.filter((item) => item.enabled ?? true)
							.map(({ label, to }) => (
								<NavbarItem
									current={isCurrentPath(pathname, to)}
									key={label}
									to={to}
								>
									{label}
								</NavbarItem>
							))}
					</NavbarSection>
					<NavbarSpacer />
					<NavbarSection>
						<Dropdown>
							<DropdownButton aria-label="Open account menu" as={NavbarItem}>
								<Avatar
									initials={avatarSource ? undefined : avatarInitial}
									square
									src={avatarSource}
								/>
							</DropdownButton>
							<DropdownMenu className="min-w-64">
								{github?.viewer ? (
									<>
										<DropdownItem
											href={github.viewer.htmlUrl}
											rel="noopener noreferrer"
											target="_blank"
										>
											<UserIcon />
											<DropdownLabel>My GitHub Profile</DropdownLabel>
										</DropdownItem>
										{gitHubInstallationSettingsUrl ? (
											<DropdownItem
												href={gitHubInstallationSettingsUrl}
												rel="noopener noreferrer"
												target="_blank"
											>
												<Cog8ToothIcon />
												<DropdownLabel>
													GitHub Installation Settings
												</DropdownLabel>
											</DropdownItem>
										) : null}
										<DropdownDivider />
									</>
								) : null}
								{session ? <SignOutButton /> : <SignInMenuItem />}
							</DropdownMenu>
						</Dropdown>
					</NavbarSection>
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarBody>
						<SidebarSection>
							{navItems.map(({ label, to }) => (
								<SidebarItem
									current={isCurrentPath(pathname, to)}
									key={label}
									to={to}
								>
									{label}
								</SidebarItem>
							))}
						</SidebarSection>
					</SidebarBody>
				</Sidebar>
			}
		>
			{children}
		</StackedLayout>
	);
}
