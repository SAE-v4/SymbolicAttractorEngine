// src/chambers/pool/systems/LensDirector.ts
import type { DayPhase, Lens } from "@/types";

const phaseToLens = (p: DayPhase): Lens =>
  p === "day"  ? "observatory" :
  p === "dusk" ? "witness" :
  p === "night"? "organ" : "garden";

export class LensDirector {
  lensA: Lens = "observatory"; // settled/current
  lensB: Lens = "observatory"; // target
  k = 1;                       // 0..1, 1 = settled
  private dwell = 0;

  constructor(
    private fadeSec = 8,       // crossfade duration (visual settling)
    private hysteresisSec = 2  // must reside in a phase for at least this long before starting a change
  ) {}

  /** advance with dt and phase; returns the effective lens for this frame */
  update(dt: number, phase: DayPhase): Lens {
    const target = phaseToLens(phase);

    // track time we've resided in a different target
    if (this.lensB !== target) this.dwell += dt; else this.dwell = 0;

    // start a transition if we are settled, target changed, and dwell passed hysteresis
    if (this.k >= 1 && this.lensA !== target && this.dwell >= this.hysteresisSec) {
      this.lensA = this.lensB;   // previous settled
      this.lensB = target;       // new target
      this.k = 0;                // begin settling
    }

    // advance fade
    if (this.k < 1) this.k = Math.min(1, this.k + dt / this.fadeSec);

    // For now: use a hard lens during fade (no palette/geometry blend yet).
    // We keep showing lensA until we fully settle to lensB.
    return this.k < 1 ? this.lensA : this.lensB;
  }
}
