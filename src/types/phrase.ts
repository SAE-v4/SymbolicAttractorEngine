import type { PhraseWheelState, BreathState, GestureMetrics } from "@/types/core";

export type PhraseId = string;

export interface Phrase {
  id: PhraseId;
  at: number;                 // performance.now()
  wheel: PhraseWheelState;    // snapshot at completion
  breath: BreathState;        // snapshot at completion (optional but nice)
  gesture?: GestureMetrics;   // last gesture metrics (optional)
}
