export type DayPhase = "dawn" | "day" | "dusk" | "night";

export class EngineClock {
  timeMs = 0;
  day01 = 0; // 0..1
  phase: DayPhase = "day";
  constructor(public dayPeriodMs = 120_000) {} // 2 min loop by default

  tick(dt: number) {
    this.timeMs += dt * 1000;
    const p = (this.timeMs % this.dayPeriodMs) / this.dayPeriodMs;
    this.day01 = p;
    this.phase =
      p < 0.25 ? "dawn" :
      p < 0.50 ? "day"  :
      p < 0.75 ? "dusk" : "night";
  }
}
