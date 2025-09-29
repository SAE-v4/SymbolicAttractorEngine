// src/types/Core.ts

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

