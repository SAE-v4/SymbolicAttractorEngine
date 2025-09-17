// Minimal palette adapter for Card chamber.
// Uses OKLCH for perceptual stability and gentle breath modulation.

export type ColorKey =
  | "light" | "shadow" | "heart" | "spirit" | "flame" | "witness" | "offering";

export type BreathPhase = "inhale" | "pause" | "exhale";

export interface LocalBreath {
  phase: BreathPhase;
  value: number;  // 0..1 within phase (0.5 during pause)
  bpm: number;
  tGlobal: number;
}

type OKLCH = { l: number; c: number; h: number };

// Base hues keyed by symbolism (tweak to taste / theme.json later)
const BASE: Record<ColorKey, OKLCH> = {
  light:    { l: 0.84, c: 0.05, h:  95 },   // warm light
  shadow:   { l: 0.22, c: 0.03, h: 250 },   // cool shadow
  heart:    { l: 0.72, c: 0.08, h:  25 },   // rose/peach
  spirit:   { l: 0.74, c: 0.08, h: 220 },   // indigo-cyan
  flame:    { l: 0.76, c: 0.10, h:  55 },   // amber
  witness:  { l: 0.20, c: 0.03, h: 240 },   // deep blue-gray
  offering: { l: 0.78, c: 0.06, h:  35 },   // soft gold
};

export function get(key: ColorKey): OKLCH {
  return { ...BASE[key] };
}

// Breath modulation: very gentle; BG should never flicker.
// - inhale: brighten slightly
// - exhale: desaturate slightly
export function withBreath(key: ColorKey, b: LocalBreath): OKLCH {
  const base = get(key);
  let dl = 0, dc = 0;
  if (b.phase === "inhale") { dl =  0.02 * b.value; }
  if (b.phase === "exhale") { dc = -0.01 * b.value; }
  return { l: clamp01(base.l + dl), c: clamp01(base.c + dc), h: base.h };
}

export function toOKLCH({ l, c, h }: OKLCH): string {
  return `oklch(${fix(l)} ${fix(c)} ${fix(h)})`;
}

// ---------------------------------------------------------------------------
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function fix(n: number) { return Number.isFinite(n) ? Number(n.toFixed(4)) : 0; }
