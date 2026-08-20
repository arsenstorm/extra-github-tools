import { EllipsisVerticalIcon } from "@heroicons/react/16/solid";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Dropdown,
	DropdownButton,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from "@/components/ui/dropdown";

const stopPropagation = (event: React.MouseEvent): void =>
	event.stopPropagation();

/**
 * The per-row actions menu. Until the row is interacted with it renders a
 * look-alike button instead of a menu, which keeps large pages cheap to paint.
 */
export function RepositoryActionsMenu({
	children,
	htmlUrl,
	interactive = true,
	repositoryName,
}: Readonly<{
	children?: React.ReactNode;
	htmlUrl: string;
	interactive?: boolean;
	repositoryName: string;
}>) {
	const label = `Actions for ${repositoryName}`;

	if (!interactive) {
		return (
			<Button aria-label={label} onClick={stopPropagation} plain type="button">
				<EllipsisVerticalIcon />
			</Button>
		);
	}

	return (
		<Dropdown>
			<DropdownButton aria-label={label} onClick={stopPropagation} plain>
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
