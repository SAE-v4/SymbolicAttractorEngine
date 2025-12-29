// src/breath/BreathEngine.ts

export type BreathPhase = "inhale" | "pause" | "exhale";

export class BreathEngine {
  inhaleDuration = 4_000;
  pauseDuration  = 800;
  exhaleDuration = 4_000;

  phase: BreathPhase = "inhale";
  phaseStart = performance.now();
  progress = 0; // 0 → 1

  update(now: number) {
    const elapsed = now - this.phaseStart;

    switch (this.phase) {
      case "inhale":
        this.progress = elapsed / this.inhaleDuration;
        if (this.progress >= 1) this.transition("pause", now);
        break;

      case "pause":
        this.progress = elapsed / this.pauseDuration;
        if (this.progress >= 1) this.transition("exhale", now);
        break;

      case "exhale":
        this.progress = elapsed / this.exhaleDuration;
        if (this.progress >= 1) this.transition("inhale", now);
        break;
    }
  }

  private transition(next: BreathPhase, now: number) {
    this.phase = next;
    this.phaseStart = now;
    this.progress = 0;
  }
}
