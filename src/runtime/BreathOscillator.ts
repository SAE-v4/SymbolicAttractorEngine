export type BreathPhase = "inhale" | "pause" | "exhale";

export class BreathOscillator {
  // read-only shape consumers expect
  value: number = 0;          // -1..0..+1 (inhale..pause..exhale)
  phase: BreathPhase = "pause";

  constructor(
    public bpm = 6,           // ~10s per cycle
    public pauseFrac = 0.12   // fraction of cycle spent in pause
  ) {}

  tick(dt: number, tAbsSec: number) {
    const secPer = 60 / this.bpm;
    const u = tAbsSec % secPer;          // 0..secPer
    const p = u / secPer;                // 0..1 in cycle

    const halfPause = this.pauseFrac / 2;
    const inhaleEnd = 0.5 - halfPause;
    const exhaleStart = 0.5 + halfPause;

    if (p < inhaleEnd) {
      // map 0..inhaleEnd -> -1..0 (gathering)
      const k = p / inhaleEnd;
      this.value = -1 + k * 1;
      this.phase = "inhale";
    } else if (p > exhaleStart) {
      // map exhaleStart..1 -> 0..+1 (expression)
      const k = (p - exhaleStart) / (1 - exhaleStart);
      this.value = 0 + k * 1;
      this.phase = "exhale";
    } else {
      this.value = 0;
      this.phase = "pause";
    }
  }
}
