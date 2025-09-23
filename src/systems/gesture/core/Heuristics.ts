import type { Point, Trace, Intent, SpiralIntent, ZigzagIntent, TapIntent } from "./Types";

// ---------- helpers ----------
function centroid(trace: Trace) {
  let sx = 0, sy = 0;
  for (const p of trace) { sx += p.x; sy += p.y; }
  const n = Math.max(1, trace.length);
  return { x: sx / n, y: sy / n };
}
function radialStats(trace: Trace, cx: number, cy: number) {
  let minR = Number.POSITIVE_INFINITY;
  let maxR = 0;
  for (const p of trace) {
    const r = Math.hypot(p.x - cx, p.y - cy);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }
  return { minR, maxR, spread: Math.max(0, maxR - minR) };
}
function duration(trace: Trace) {
  if (trace.length < 2) return 0;
  return trace[trace.length - 1].t - trace[0].t;
}
function bbox(trace: Trace) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of trace) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
}

// Optional smoothing: unwrap angle to [-π,π]
function angDiff(a: number, b: number) {
  let d = a - b;
  if (d >  Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---------- detectors ----------
export function detectSpiral(trace: Trace): SpiralIntent | null {
  if (!trace || trace.length < 24) return null;

  // 1) accumulated signed turning angle
  let thetaSum = 0;
  let lastAng: number | null = null;
  for (let i = 1; i < trace.length; i++) {
    const dx = trace[i].x - trace[i-1].x;
    const dy = trace[i].y - trace[i-1].y;
    const a = Math.atan2(dy, dx);
    if (lastAng != null) thetaSum += angDiff(a, lastAng);
    lastAng = a;
  }
  const laps = Math.abs(thetaSum) / (Math.PI * 2);
  const dir  = thetaSum > 0 ? "ccw" : "cw";

  // 2) radial spread gate (avoid scribbles)
  const c = centroid(trace);
  const { spread, maxR } = radialStats(trace, c.x, c.y);

  // --- thresholds (tune) ---
  const LAPS_MIN = 0.7;          // ~3/4 turn
  const SPREAD_MIN = 18;         // px
  const R_MIN = 12;              // px (avoid tiny dots)

  if (laps >= LAPS_MIN && spread >= SPREAD_MIN && maxR >= R_MIN) {
    const conf = Math.max(0, Math.min(1, (laps - LAPS_MIN) / 1.2));
    return {
      kind: "spiral",
      dir,
      laps: Number(laps.toFixed(2)),
      center: { x: c.x, y: c.y },
      radius: maxR,
      confidence: conf
    };
  }
  return null;
}

export function detectZigzag(trace: Trace): ZigzagIntent | null {
  if (!trace || trace.length < 12) return null;

  // Determine dominant axis by bbox
  const bb = bbox(trace);
  const axis: "x" | "y" = bb.w >= bb.h ? "x" : "y";

  // Project movements on the dominant axis and count sign flips
  let flips = 0;
  let lastSign = 0;
  let amplitude = 0;
  for (let i = 1; i < trace.length; i++) {
    const d = axis === "x" ? (trace[i].x - trace[i-1].x) : (trace[i].y - trace[i-1].y);
    const sign = d > 0 ? 1 : d < 0 ? -1 : 0;
    amplitude = Math.max(amplitude, Math.abs(d));
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) flips++;
    if (sign !== 0) lastSign = sign;
  }

  const FLIPS_MIN = 3;
  const AMP_MIN = 6;

  if (flips >= FLIPS_MIN && amplitude >= AMP_MIN) {
    const conf = Math.max(0, Math.min(1, (flips - FLIPS_MIN) / 6));
    return { kind: "zigzag", axis, oscillations: flips, amplitude, confidence: conf };
  }
  return null;
}

export function detectTapHold(trace: Trace): TapIntent | null {
  if (!trace || trace.length < 2) return null;
  const dur = duration(trace);
  const bb  = bbox(trace);
  const R_MAX = 8;   // tight cluster
  const T_TAP_MAX = 0.20;  // 200ms
  const T_HOLD_MIN = 0.45; // >450ms

  const small = bb.w <= R_MAX && bb.h <= R_MAX;

  if (small && dur <= T_TAP_MAX) {
    return { kind: "tap", pos: centroid(trace), duration: dur, confidence: 0.9 };
  }
  if (small && dur >= T_HOLD_MIN) {
    return { kind: "hold", pos: centroid(trace), duration: dur, confidence: 0.8 };
  }
  return null;
}

// ---------- aggregator ----------
export function inferIntents(trace: Trace): Intent[] {
  const intents: Intent[] = [];
  const s = detectSpiral(trace);  if (s) intents.push(s);
  const z = detectZigzag(trace);  if (z) intents.push(z);
  const t = detectTapHold(trace); if (t) intents.push(t);

  // Simple ranking: highest confidence first
  intents.sort((a, b) => (b as any).confidence - (a as any).confidence);
  // Optional: keep top-1 for now
  return intents.length ? [intents[0]] : [];
}
