// src/engine/EngineClock.ts
import type { DayPhase } from "@/types/Core";

export class EngineClock {
  public day01 = 0; // 0..1 over a virtual day
  public phase: DayPhase = "night";
  constructor(private periodSec = 120) {} // 2-minute day by default
  tick(dt: number) {
    this.day01 = (this.day01 + dt / this.periodSec) % 1;
    const x = this.day01;
    this.phase = x < 0.2 ? "night" : x < 0.3 ? "dawn" : x < 0.8 ? "day" : "dusk";
  }
}
