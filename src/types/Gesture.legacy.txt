// Minimal shared gesture types for both chambers.

export type GestureKind =
  | "spiral"     // CW/CCW curling trace
  | "zigzag"     // alternating direction (≈ swipe/zig)
  | "tap-hold"   // stationary press/hold
  | "tap"        // short press
  | "flick"      // short, fast swipe
  | "unknown";

export type GestureDirection = "cw" | "ccw" | "none";

export interface TracePoint {
  x: number;
  y: number;
  t: number; // seconds
}

export interface GestureTrace {
  points: TracePoint[];
  // precomputed features (optional; engine may fill them)
  length?: number;
  duration?: number;
}

export interface GestureIntent {
  kind: GestureKind;
  dir?: GestureDirection;     // spiral direction
  confidence: number;         // 0..1
  meta?: Record<string, number | string | boolean>;
  // a thumbnail of the trace for debugging/visualization
  trace?: GestureTrace;
}
