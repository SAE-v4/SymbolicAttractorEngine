// Unified breathing helpers for visual/audio sync.
// phase: 0..1 (from services.tempo.phase())

export type BreathOpts = {
  /** phase offset in cycles (e.g. 0.25 = +90°) */
  offset?: number;
  /** shaping (>1 = softer peaks, <1 = punchier) */
  shape?: number;
  /** width of the downbeat pulse in cycles (0..0.5) */
  beatWidth?: number;
};

const TAU = Math.PI * 2;

function wrap01(x: number) {
  return x - Math.floor(x);
}

/** Core 0..1 envelope (sin-based), optionally shaped */
export function getBreath(phase: number, opts: BreathOpts = {}): number {
  const p = wrap01(phase + (opts.offset ?? 0));
  const base = 0.5 + 0.5 * Math.sin(TAU * p); // 0..1
  const k = opts.shape ?? 1;
  return k === 1 ? base : Math.pow(base, k);
}

/** Inhaling when d/dt(sin) > 0 → cos > 0 */
export function isInhale(phase: number, opts: BreathOpts = {}): boolean {
  const p = wrap01(phase + (opts.offset ?? 0));
  return Math.cos(TAU * p) > 0;
}

/** Symmetric downbeat pulse near phase≈0 (and 1). 0..1 */
export function getDownbeat(phase: number, opts: BreathOpts = {}): number {
  const width = Math.max(0.001, Math.min(0.5, opts.beatWidth ?? 0.08));
  const p = wrap01(phase + (opts.offset ?? 0));
  const d = Math.min(p, 1 - p);          // distance to 0/1
  const t = Math.max(0, 1 - d / width);  // triangle
  // ease for a softer peak (smoothstep-like)
  return t * t * (3 - 2 * t);
}

/** Convenience bundle if you prefer one call */
export function getBreathEnv(phase: number, opts: BreathOpts = {}) {
  const breath = getBreath(phase, opts);     // 0..1
  const inhale = isInhale(phase, opts);
  const downbeat = getDownbeat(phase, opts); // 0..1
  return { breath, inhale, downbeat };
}
