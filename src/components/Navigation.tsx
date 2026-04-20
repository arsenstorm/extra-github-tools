"use client";

import {
	ArrowRightStartOnRectangleIcon,
	HomeIcon,
} from "@heroicons/react/16/solid";
import { toast } from "sonner";
import { authClient } from "@/auth.client";
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

const navItems = [{ label: "Home", to: "/" as const }] as const;

function SignOutButton() {
	return (
		<DropdownItem
			onClick={async () => {
				const { error } = await authClient.signOut();

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

export function Navigation({
	children,
}: {
	readonly children: React.ReactNode;
}): React.ReactNode {
	const { data } = authClient.useSession();

	const user = data?.user;
	const userInitial =
		user?.name?.slice(0, 1).toUpperCase() ??
		user?.email?.slice(0, 1).toUpperCase() ??
		"?";

	return (
		<StackedLayout
			navbar={
				<Navbar>
					<NavbarSection className="max-lg:hidden">
						{navItems.map(({ label, ...linkProps }) => (
							<NavbarItem {...linkProps} key={label}>
								<HomeIcon />
								{label}
							</NavbarItem>
						))}
					</NavbarSection>
					<NavbarSpacer />
					<NavbarSection className={user ? undefined : "hidden"}>
						<Dropdown>
							<DropdownButton as={NavbarItem}>
								<Avatar
									initials={user?.image ? undefined : userInitial}
									square
									src={user?.image}
								/>
							</DropdownButton>
							<DropdownMenu className="min-w-64">
								<DropdownItem to="/">
									<HomeIcon />
									<DropdownLabel>
										{user?.name ?? user?.email ?? "Home"}
									</DropdownLabel>
								</DropdownItem>
								{user?.email ? (
									<DropdownItem href={`mailto:${user.email}`}>
										<HomeIcon />
										<DropdownLabel>{user.email}</DropdownLabel>
									</DropdownItem>
								) : null}
								{data?.session ? <DropdownDivider /> : null}
								<SignOutButton />
							</DropdownMenu>
						</Dropdown>
					</NavbarSection>
				</Navbar>
			}
			sidebar={
				<Sidebar>
					<SidebarBody>
						<SidebarSection>
							{navItems.map(({ label, ...linkProps }) => (
								<SidebarItem {...linkProps} key={label}>
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
