// src/types/Core.ts

// Breath phases used across the app
export type BreathPhase = "inhale" | "pause" | "exhale";

// Breath sample emitted each frame (engine-root → chambers)
export interface BreathSample {
  // normalized “semantic” value in [-1..+1], exhale..inhale
  value: number;
  phase: BreathPhase;
  // optional helpers
  isExhaling?: boolean;
  bpm: number; // 0 for manual
}

// Day/Night phase for lightweight ambient modulation
export type DayPhase = "night" | "dawn" | "day" | "dusk";

// Frame payload (engine-root → subtree)
export interface EngineTick {
  time: number; // absolute seconds since page start
  dt: number;   // delta seconds
  clock: { day01: number; phase: DayPhase };
  breath: BreathSample;
  // future: pointer/gaze, audio metering, etc.
}
