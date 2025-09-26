// src/types/Gesture.ts
import type { Vec2 } from "./Math";

export type GestureKind = "trace-spiral" | "trace-zigzag" | "tap-hold";
export type GestureDirection = "cw" | "ccw" | undefined;

export interface GestureResult {
  kind: GestureKind;
  direction?: GestureDirection;
  confidence: number;        // 0..1
  centroid: Vec2;            // pool-local or normalized per adapter
  // optional extras (duration, path metrics) can be added later
}
