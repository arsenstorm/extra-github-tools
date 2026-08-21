import clsx from "clsx";
import { useEffect, useRef } from "react";
import {
	CELL,
	clamp01,
	easeOutCubic,
	paintColumn,
	prefersReducedMotion,
} from "./dither-paint";
import { type DitherColor, seedOfColor } from "./palette";
import { useChartDimensions } from "./use-chart-dimensions";

export interface BarListItem {
	/** Per-item hue override — e.g. `grey` for a bot or an "everything else" bucket. */
	color?: DitherColor;
	key: string;
	label: React.ReactNode;
	value: number;
	/** Text shown at the end of the row; defaults to the localized value. */
	valueLabel?: string;
}

// Fraction of the entrance spent staggering row starts.
const STAGGER = 0.55;
const ENTRANCE_MS = 900;
const TRACK_HEIGHT = 16; // css px — 8 dither cells tall
const DIM = 0.5;

interface BarPaintJob {
	activeKey: string | null;
	canvas: HTMLCanvasElement;
	color: DitherColor;
	item: BarListItem;
	lengthCells: number;
	max: number;
	offscreen: HTMLCanvasElement;
	offscreenContext: CanvasRenderingContext2D;
	start: number;
	thickCells: number;
}

/** Paint one bar at `progress` (0–1 of the entrance) onto its canvas. */
const paintBar = (progress: number, job: BarPaintJob): void => {
	const context = job.canvas.getContext("2d");
	if (!context) {
		return;
	}
	// Setting the size also clears the canvas for this repaint.
	job.canvas.width = job.lengthCells;
	job.canvas.height = job.thickCells;
	const grown =
		(job.item.value / job.max) *
		easeOutCubic(clamp01((progress - job.start) / (1 - STAGGER)));
	if (grown <= 0) {
		return;
	}
	const isActive = job.activeKey === job.item.key;
	const dim = job.activeKey !== null && !isActive ? DIM : 1;
	job.offscreenContext.clearRect(0, 0, job.thickCells, job.lengthCells);
	const top = (1 - grown) * job.lengthCells;
	const seed = seedOfColor(job.item.color ?? job.color);
	for (let x = 0; x < job.thickCells; x += 1) {
		paintColumn(job.offscreenContext, x, top, job.lengthCells, seed, {
			dim,
			intensity: isActive ? 1 : 0,
			stacked: false,
			variant: "gradient",
		});
	}
	// Rotate the vertically-painted bar 90° clockwise: offscreen (x, y) lands at
	// (lengthCells − y, x), so the baseline maps to the left edge.
	context.save();
	context.translate(job.lengthCells, 0);
	context.rotate(Math.PI / 2);
	context.drawImage(job.offscreen, 0, 0);
	context.restore();
};

/**
 * Horizontal dither **bar list** — one labelled row per item, values always
 * visible, longest bar = the max. Each bar is painted with the shared
 * {@link paintColumn} dither on an offscreen canvas (as a vertical bar) and
 * blitted rotated 90°, so the baseline lands on the left and the soft outline
 * on the value end. Rows grow in a staggered top-to-bottom wave.
 *
 * Emphasis is controlled: the row whose key is `activeKey` is lifted and the
 * rest are dimmed, so several lists can highlight the same entity together.
 * `renderRow` wraps each row's cells (e.g. in a button) to own the interaction.
 */
export function BarList({
	activeKey = null,
	className,
	color = "blue",
	items,
	renderRow,
}: Readonly<{
	activeKey?: string | null;
	className?: string;
	/** Series hue for items without their own `color`. */
	color?: DitherColor;
	items: BarListItem[];
	renderRow?: (item: BarListItem, cells: React.ReactNode) => React.ReactNode;
}>) {
	const { ref: trackRef, size } = useChartDimensions<HTMLDivElement>();
	const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
	const activeRef = useRef(activeKey);
	const itemsRef = useRef(items);
	const progressRef = useRef(0);
	// Parents tend to rebuild `items` on every render; only a change in what the
	// bars show should restart the entrance, so the effect keys on content.
	const itemsKey = items
		.map((item) => `${item.key}:${item.value}:${item.color ?? ""}`)
		.join("|");

	itemsRef.current = items;
	const paintRef = useRef<(progress: number) => void>(() => {
		// replaced once the paint effect runs
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: itemsKey stands in for items (see above)
	useEffect(() => {
		const { width } = size;
		const currentItems = itemsRef.current;
		if (width <= 0 || currentItems.length === 0) {
			return;
		}
		const lengthCells = Math.max(8, Math.round(width / CELL));
		const thickCells = Math.max(2, Math.round(TRACK_HEIGHT / CELL));
		const max = Math.max(...currentItems.map((item) => item.value), 1);
		const offscreen = document.createElement("canvas");
		offscreen.width = thickCells;
		offscreen.height = lengthCells;
		const offscreenContext = offscreen.getContext("2d");
		if (!offscreenContext) {
			return;
		}

		const paintAll = (progress: number): void => {
			currentItems.forEach((item, index) => {
				const canvas = canvasRefs.current[index];
				if (!canvas) {
					return;
				}
				paintBar(progress, {
					activeKey: activeRef.current,
					canvas,
					color,
					item,
					lengthCells,
					max,
					offscreen,
					offscreenContext,
					start:
						currentItems.length > 1
							? (index / (currentItems.length - 1)) * STAGGER
							: 0,
					thickCells,
				});
			});
		};
		paintRef.current = paintAll;

		if (prefersReducedMotion()) {
			progressRef.current = 1;
			paintAll(1);
			return;
		}
		let frame = 0;
		let startTime = 0;
		const tick = (now: number): void => {
			if (!startTime) {
				startTime = now;
			}
			const progress = Math.min(1, (now - startTime) / ENTRANCE_MS);
			progressRef.current = progress;
			paintAll(progress);
			if (progress < 1) {
				frame = requestAnimationFrame(tick);
			}
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [size, itemsKey, color]);

	// Emphasis changes are a repaint at the current progress, not a re-entrance.
	useEffect(() => {
		activeRef.current = activeKey;
		paintRef.current(progressRef.current);
	}, [activeKey]);

	return (
		<ul className={clsx("flex flex-col", className)}>
			{items.map((item, index) => {
				const cells = (
					<>
						<span className="min-w-0 text-base/6 text-zinc-600 sm:text-sm/6 dark:text-zinc-400">
							{item.label}
						</span>
						<span
							className="relative"
							ref={index === 0 ? trackRef : undefined}
							style={{ height: TRACK_HEIGHT }}
						>
							<canvas
								aria-hidden
								className="absolute inset-0 h-full w-full"
								ref={(element) => {
									canvasRefs.current[index] = element;
								}}
								style={{ imageRendering: "pixelated" }}
							/>
						</span>
						<span className="text-right text-base/6 text-zinc-950 tabular-nums sm:text-sm/6 dark:text-white">
							{item.valueLabel ?? item.value.toLocaleString()}
						</span>
					</>
				);

				return (
					<li key={item.key}>
						{renderRow === undefined ? cells : renderRow(item, cells)}
					</li>
				);
			})}
		</ul>
	);
}
