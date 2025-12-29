export type BreathPhase = "inhale" | "pause" | "exhale";

export type SlotIndex = 0 | 1 | 2 | 3 | 4;

export interface Vec2 {
  x: number;
  y: number;
}

export interface TimeState {
  now: number;      // performance.now()
  dt: number;       // ms since last frame
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

export interface PhraseSlotState {
  filled: boolean;
  strength: number; // 0..1
}

export interface PhraseWheelState {
  active: SlotIndex;
  slots: readonly PhraseSlotState[]; // length 5
}

export type PhraseMode = "oneBreath" | "compose";

export interface BreathState {
  phase: BreathPhase;
  progress: number; // 0..1 in-phase
}

export interface WorldState {
  breath: BreathState;
  wheel: PhraseWheelState;
  // later: pips, observers, majors, etc.
}
