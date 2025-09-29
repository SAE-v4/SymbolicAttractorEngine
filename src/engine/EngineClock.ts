// src/engine/EngineClock.ts
import type { DayPhase } from "@/types"

export class EngineClock {
  public day01 = 0;                  // 0..1
  public dayCount = 0;               // completed days
  public phase: DayPhase = "night";
  public onPhaseChange?: (p: DayPhase) => void;

  public week01 = 0;           // 0..1 over a 7-part macro
  public axisIndex = 0;
  

  constructor(public periodSec = 12, private macroSec = 7 * 12) { }

  tick(dt: number) {
    const prev = this.day01;
    this.day01 = (prev + dt / this.periodSec) % 1;

    if (this.day01 < prev) this.dayCount++;             // new day rollover

    const x = this.day01;
    const newPhase: DayPhase = x < 0.20 ? "night"
      : x < 0.30 ? "dawn"
        : x < 0.80 ? "day"
          : "dusk";
    this.week01 = (this.week01 + dt / this.macroSec) % 1;
    this.axisIndex = Math.floor(this.week01 * 7) % 7;
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.onPhaseChange?.(newPhase);
    }
  }
}
