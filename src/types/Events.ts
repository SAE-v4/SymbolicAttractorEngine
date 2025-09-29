// src/types/Events.ts
import type { EngineTick } from "./Core";
import type { PoolSeed } from "./Seeds";
import type { DayPhase } from "./Core";
import type { GestureResult } from "./Gesture";

/** Event payloads used across the app */
export interface SAEEventMap {
  "engine-tick": EngineTick;
  "day-phase": { phase: DayPhase };
  "pool:seed": PoolSeed;
  "gesture:end": GestureResult; // emitted by gesture system bus/adapters
}

/** Helper to create typed CustomEvents */
export function createEvent<K extends keyof SAEEventMap>(type: K, detail: SAEEventMap[K]) {
  return new CustomEvent<SAEEventMap[K]>(type, { detail, bubbles: true, composed: true });
}

/** DOM event map augmentation for TS intellisense on addEventListener */
declare global {
  interface DocumentEventMap extends SAEEventMap {} // optional
  interface WindowEventMap extends SAEEventMap {}   // optional
  interface HTMLElementEventMap extends SAEEventMap {}
}
