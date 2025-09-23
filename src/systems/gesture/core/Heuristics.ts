import { Trace, Intent, SpiralIntent, ZigzagIntent, TapIntent } from "./Types";

export function detectSpiral(trace: Trace): SpiralIntent | null { return null }
export function detectZigzag(trace: Trace): ZigzagIntent | null { return null }
export function detectTapHold(trace: Trace): TapIntent | null { return null }

export function inferIntents(trace: Trace): Intent[] {
  const out: Intent[] = [];
  const s = detectSpiral(trace); if (s) out.push(s);
  const z = detectZigzag(trace); if (z) out.push(z);
  const t = detectTapHold(trace); if (t) out.push(t);
  // …score/merge if multiple, sort by confidence
  return out;
}
