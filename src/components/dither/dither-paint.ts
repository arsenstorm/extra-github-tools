// Ported from arsenstorm.com (MIT, © Arsen Shkrumelyak) — the ordered-dither
// paint engine behind its charts, trimmed to what the bar list needs.
import { rgb, type Seed } from "./palette";

const BAYER_SIZE = 4;
const BAYER_STEPS = 16;

// 4×4 ordered (Bayer) matrix, normalized to 0–1 thresholds.
export const BAYER = [
	[0, 8, 2, 10],
	[12, 4, 14, 6],
	[3, 11, 1, 9],
	[15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / BAYER_STEPS));

export const CELL = 2; // css px per dither cell — chunky enough to read pixelated
// Opacity of the top border outline (just under solid, so it reads as a soft
// edge rather than a hard line).
export const BORDER_ALPHA = 0.72;
// Opacity of a dither "off" cell relative to an "on" cell. The scatter modulates
// between these two tiers of the *same* colour instead of leaving holes, so the
// background never shows through as stark white on a light theme.
export const OFF_TIER = 0.4;

const DOTTED_BIAS = 0.12;
const STACKED_BIAS = 0.2;
const HOVER_THRESHOLD_LIFT = 0.1;
const HOVER_ALPHA_LIFT = 0.22;
const MIN_DENSITY_ALPHA = 0.3;

export type PaintVariant = "dotted" | "gradient" | "hatched" | "solid";

export interface PaintOpts {
	dim: number; // selection dim multiplier (0.5 dimmed, 1 normal)
	intensity: number; // 0–1 hover lift
	sparse?: number; // raise the dither threshold (thin out) — front layers
	stacked: boolean; // denser + solid floor when layers stack
	variant: PaintVariant;
}

const bayerAt = (x: number, y: number): number =>
	BAYER[y % BAYER_SIZE]?.[x % BAYER_SIZE] ?? 0;

// Colour vs opacity — the guiding rule for the whole engine: every pixel is the
// series' single `fill` colour and only its alpha varies, so the same paint
// reads correctly on both light and dark backgrounds.

/**
 * Fill one backing-canvas column `x` from row `top` down to `floor` with the
 * ordered-dither scatter — solid at the floor, dissolving upward so it fades
 * out toward the value line — then cap the top with a soft border outline in
 * the series colour.
 */
export function paintColumn(
	context: CanvasRenderingContext2D,
	x: number,
	top: number,
	floor: number,
	seed: Seed,
	{ variant, intensity, dim, stacked, sparse = 0 }: PaintOpts
): void {
	const t = Math.round(top);
	const f = Math.round(floor);
	const depth = f - t;
	if (depth <= 0) {
		context.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim);
		context.fillRect(x, t, 1, 1);
		return;
	}
	const bias =
		(variant === "dotted" ? DOTTED_BIAS : 0) +
		(stacked ? STACKED_BIAS : 0) -
		sparse;
	for (let y = t; y < f; y += 1) {
		// Inverted falloff: 0 at the top line, 1 at the floor — dense at the
		// bottom, thinning as it rises toward the outline.
		let density = (y - t) / depth;
		if (stacked) {
			density = 0.5 + 0.5 * density;
		}
		if (variant === "hatched" && (x + y) % BAYER_SIZE >= 2) {
			continue;
		}
		const lit =
			variant === "solid" ||
			density > bayerAt(x, y) - HOVER_THRESHOLD_LIFT * intensity - bias;
		// "dotted" keeps real gaps for its open look; every other variant covers
		// the cell and lets the dither ride the alpha.
		if (variant === "dotted" && !lit) {
			continue;
		}
		const k =
			(MIN_DENSITY_ALPHA + density * (1 - MIN_DENSITY_ALPHA)) *
			(1 + HOVER_ALPHA_LIFT * intensity);
		const alpha = clamp01((lit ? k : k * OFF_TIER) * dim);
		context.fillStyle = rgb(seed.fill, 1, alpha);
		context.fillRect(x, y, 1, 1);
	}
	// Top border outline — kept just under full opacity, with a faint feather
	// row beneath, so it reads as a soft edge rather than a hard line.
	context.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim);
	context.fillRect(x, t, 1, 1);
	if (depth > 1) {
		context.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * 0.5 * dim);
		context.fillRect(x, t + 1, 1, 1);
	}
}

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Whether the OS asks for reduced motion (snap to the final frame). */
export const prefersReducedMotion = (): boolean =>
	window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
