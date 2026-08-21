import clsx from "clsx";
import { Divider } from "@/components/ui/divider";
import { Strong, Text } from "@/components/ui/text";

const BAR_CLASS_NAME = "animate-pulse rounded bg-zinc-950/10 dark:bg-white/10";
const TILE_KEYS = ["commits", "contributors", "net-lines", "files"];
const PANEL_KEYS = ["commits", "additions", "deletions", "active-weeks"];
const ROW_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"];
// Widths fall off like a real ranking so the panels read as charts, not boxes.
const ROW_WIDTHS = ["100%", "62%", "41%", "30%", "24%", "18%", "14%", "11%"];

function Bar({
	className,
	style,
}: Readonly<{ className: string; style?: React.CSSProperties }>) {
	return (
		<span className={clsx("block", BAR_CLASS_NAME, className)} style={style} />
	);
}

function TilePlaceholder() {
	return (
		<div className="space-y-2 bg-white p-5 dark:bg-zinc-950">
			<Bar className="h-4 w-20" />
			<Bar className="mt-3 h-8 w-16" />
			<Bar className="h-3 w-28" />
		</div>
	);
}

function PanelPlaceholder() {
	return (
		<div className="rounded-lg border border-zinc-950/10 p-5 dark:border-white/10">
			<Bar className="h-4 w-24" />
			<ul className="mt-3 space-y-0.5">
				{ROW_KEYS.map((key, index) => (
					<li
						className="grid min-h-10 grid-cols-[minmax(0,9rem)_minmax(0,1fr)_4.5rem] items-center gap-3"
						key={key}
					>
						<Bar className="h-3.5 w-4/5" />
						<span className="h-2 overflow-hidden rounded-r-full bg-zinc-950/5 dark:bg-white/5">
							<Bar
								className="h-full rounded-r-full"
								style={{ width: ROW_WIDTHS[index] ?? "0%" }}
							/>
						</span>
						<Bar className="ml-auto h-3.5 w-10" />
					</li>
				))}
			</ul>
			<span className="mt-3 block min-h-5" />
		</div>
	);
}

/**
 * The analysis layout with placeholder bars, shown while statistics load.
 * The status line sits where the coverage note will be, so the page keeps
 * its shape when the numbers land.
 */
export function RepoAnalysisSkeleton({
	org,
	repo,
	status,
}: Readonly<{
	org: string;
	repo: string;
	/** What the wait is for; the repository name is filled in. */
	status: "analyzing" | "github-calculating";
}>) {
	return (
		<output aria-busy="true" aria-live="polite" className="block">
			<Text>
				{status === "analyzing" ? (
					<>
						Analyzing{" "}
						<Strong>
							{org}/{repo}
						</Strong>
						…
					</>
				) : (
					<>
						GitHub is still calculating statistics for{" "}
						<Strong>
							{org}/{repo}
						</Strong>
						. This page retries automatically.
					</>
				)}
			</Text>
			<Divider className="my-6" />
			<div className="space-y-8">
				<div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-950/10 bg-zinc-950/10 lg:grid-cols-4 dark:border-white/10 dark:bg-white/10">
					{TILE_KEYS.map((key) => (
						<TilePlaceholder key={key} />
					))}
				</div>
				<Bar className="h-4 w-2/3 max-w-lg" />
				<div className="grid gap-4 md:grid-cols-2">
					{PANEL_KEYS.map((key) => (
						<PanelPlaceholder key={key} />
					))}
				</div>
			</div>
		</output>
	);
}
