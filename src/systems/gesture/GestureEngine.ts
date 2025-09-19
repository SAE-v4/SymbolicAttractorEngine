import type { GestureTrace, GestureIntent, GestureKind, GestureDirection, TracePoint } from "@/types/Gesture";
import { resample, pathLength, duration, centroid, winding, directionChanges, avgSpeed } from "./trace";

export interface GestureEngineOptions {
  resampleCount?: number;   // resample to N points for stability
  minLength?: number;       // px
  minDuration?: number;     // s
}

export class GestureEngine {
  private opt: Required<GestureEngineOptions>;

  constructor(opt: GestureEngineOptions = {}) {
    this.opt = {
      resampleCount: opt.resampleCount ?? 64,
      minLength:     opt.minLength     ?? 24,
      minDuration:   opt.minDuration   ?? 0.05,
    };
  }

  classify(rawPoints: TracePoint[]): GestureIntent {
    if (!rawPoints || rawPoints.length < 2) return this.intent("unknown", 0.1);

    const pts = resample(rawPoints, this.opt.resampleCount);
    const len = pathLength(pts);
    const dur = duration(pts);

    const trace: GestureTrace = { points: pts, length: len, duration: dur };

    if (len < this.opt.minLength || dur < this.opt.minDuration) {
      // Short interactions → tap vs tap-hold
      const held = dur > 0.25; // trivial threshold for now
      return this.intent(held ? "tap-hold" : "tap", held ? 0.8 : 0.7, { len, dur }, trace);
    }

    // Quick flick?
    const speed = avgSpeed(pts);
    if (speed > 1500 && dur < 0.25) {
      return this.intent("flick", 0.8, { speed, dur, len }, trace);
    }

    // Spiral detection via net angular winding and radial variance
    const { dir, turns, radialVar } = winding(pts, centroid(pts));
    if (Math.abs(turns) > 0.7 && radialVar > 0.08) {
      const d: GestureDirection = turns > 0 ? "ccw" : "cw";
      const conf = Math.min(1, Math.abs(turns)); // crude map
      return this.intent("spiral", conf, { turns, radialVar }, trace, d);
    }

    // Zigzag: many direction changes with moderate amplitude
    const zig = directionChanges(pts);
    if (zig.count >= 3 && zig.amplitude > 10) {
      const conf = Math.min(1, 0.2 * zig.count + 0.01 * zig.amplitude);
      return this.intent("zigzag", conf, { n: zig.count, amp: zig.amplitude }, trace);
    }

    return this.intent("unknown", 0.3, { len, dur, speed }, trace);
  }

  private intent(kind: GestureKind, confidence: number, meta?: Record<string, number>, trace?: GestureTrace, dir?: "cw"|"ccw"): GestureIntent {
    return { kind, confidence, dir, meta, trace };
  }
}
