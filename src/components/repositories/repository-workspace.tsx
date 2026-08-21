import { Deferred } from "./deferred";
import { RepositoryStartState } from "./start-state";
import type { TableColumn } from "./table-head";
import { RepositoriesTableSkeleton } from "./table-skeleton";

/**
 * The body of a repository tool: an inert toolbar while nothing is loaded,
 * a skeleton while the list loads, and the loaded list rendered by `children`.
 */
export function RepositoryWorkspace<Data>({
	children,
	columns,
	isLoading,
	promise,
	resetKey,
	selectable = true,
	startMessage,
	toolbar,
}: Readonly<{
	children: (data: Data) => React.ReactNode;
	columns: TableColumn[];
	/** A navigation is in flight for a new list; show the skeleton right away. */
	isLoading: boolean;
	/** The deferred list, or null when no account is selected. */
	promise: Promise<Data> | null;
	/** Changes when a different list is requested, so the skeleton shows again. */
	resetKey: string;
	/** Whether the table has a select column; the skeleton matches. */
	selectable?: boolean;
	startMessage: string;
	/** The toolbar to show while the list is not interactive. */
	toolbar: React.ReactNode;
}>) {
	const loadingState = (
		<>
			{toolbar}
			<RepositoriesTableSkeleton columns={columns} selectable={selectable} />
		</>
	);

	if (promise && isLoading) {
		return loadingState;
	}

	if (promise) {
		return (
			<Deferred fallback={loadingState} key={resetKey} promise={promise}>
				{children}
			</Deferred>
		);
	}

	return (
		<>
			{toolbar}
			<RepositoryStartState>{startMessage}</RepositoryStartState>
		</>
	);
}
