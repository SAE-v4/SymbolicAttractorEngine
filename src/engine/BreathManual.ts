// src/engine/BreathManual.ts
import type { BreathPhase } from "@/types/Core";

/** Press to exhale, release to inhale; value eases toward target. */
export class BreathManual {
  public value = 0;              // -1..+1
  public isExhaling = false;
  public phase: BreathPhase = "pause";

  press()   { this.isExhaling = true; }
  release() { this.isExhaling = false; }

  tick(dt: number) {
    const target = this.isExhaling ? -1 : +1;
    const k = 6; // approach speed
    this.value += (target - this.value) * (1 - Math.exp(-k * dt));
    const a = Math.abs(this.value);
    this.phase = a < 0.05 ? "pause" : (this.value > 0 ? "inhale" : "exhale");
  }
}
