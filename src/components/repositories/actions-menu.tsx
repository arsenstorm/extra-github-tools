import { EllipsisVerticalIcon } from "@heroicons/react/16/solid";
import type React from "react";
import {
	Dropdown,
	DropdownButton,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from "@/components/ui/dropdown";

export function RepositoryActionsMenu({
	children,
	htmlUrl,
	repositoryName,
}: Readonly<{
	children?: React.ReactNode;
	htmlUrl: string;
	repositoryName: string;
}>) {
	return (
		<Dropdown>
			<DropdownButton
				aria-label={`Actions for ${repositoryName}`}
				onClick={(event: React.MouseEvent) => event.stopPropagation()}
				plain
			>
				<EllipsisVerticalIcon />
			</DropdownButton>
			<DropdownMenu anchor="bottom end">
				{children}
				<DropdownItem href={htmlUrl} rel="noopener noreferrer" target="_blank">
					<DropdownLabel>View on GitHub</DropdownLabel>
				</DropdownItem>
			</DropdownMenu>
		</Dropdown>
	);
}
