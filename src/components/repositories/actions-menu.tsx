import { EllipsisVerticalIcon } from "@heroicons/react/16/solid";
import {
	Dropdown,
	DropdownButton,
	DropdownItem,
	DropdownLabel,
	DropdownMenu,
} from "@/components/ui/dropdown";

export function RepositoryActionsMenu({
	htmlUrl,
	repositoryName,
}: Readonly<{
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
				<DropdownItem href={htmlUrl} rel="noopener noreferrer" target="_blank">
					<DropdownLabel>View on GitHub</DropdownLabel>
				</DropdownItem>
			</DropdownMenu>
		</Dropdown>
	);
}
