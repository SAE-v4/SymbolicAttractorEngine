// src/engine/BreathOscillator.ts
import type { BreathPhase } from "@/types/Core";

export class BreathOscillator {
  public bpm: number;
  public value = 0;           // -1..+1 (exhale..inhale)
  public phase: BreathPhase = "pause";
  constructor(bpm = 6) { this.bpm = Math.max(2, bpm); }

  tick(_dt: number, tAbsSec: number) {
    const period = 60 / this.bpm;
    const x = (tAbsSec % period) / period; // 0..1

    if (x < 0.45) {
      this.phase = "inhale";
      this.value = -1 + (x / 0.45) * 2; // -1→+1
    } else if (x < 0.55) {
      this.phase = "pause";
      this.value = 0;
    } else {
      this.phase = "exhale";
      const y = (x - 0.55) / 0.45; // 0..1
      this.value = +1 - y * 2;     // +1→-1
    }
  }
}
