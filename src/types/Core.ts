// src/types/Core.ts
export interface Vec2 { x: number; y: number; }

// Breath phases used across the app
export type BreathPhase = "inhale" | "pause" | "exhale";

// Breath sample emitted each frame (engine-root → chambers)
export interface BreathSample {
  // normalized semantic value in [-1..+1], exhale..inhale
  value: number;
  phase: BreathPhase;
  // optional helper (manual mode may provide it)
  isExhaling?: boolean;
  bpm: number; // 0 for manual
}

// Day/Night phase for ambient modulation (meso rhythm)
export type DayPhase = "night" | "dawn" | "day" | "dusk";

// Frame payload (engine-root → subtree)
export interface EngineTick {
  time: number;
  dt: number;
  clock: {
    day01: number;
    phase: DayPhase;
    axisIndex?: number;   // NEW (0..6) for 7D seasoning
    week01?: number;      // optional, if you expose the macro progress
  };
  breath: BreathSample;
}

export interface GesturePoint extends Vec2 {
  t: number;        // performance.now()
}

export interface GestureMetrics {
  strength: number;   // 0..1
  centroid: Vec2;

  curvature: number;  // -1..+1 (sign = turn direction, magnitude = curviness)
  jaggedness: number; // 0..1
  speed: number;      // 0..1
  gesture?: GestureMetrics; 
}
