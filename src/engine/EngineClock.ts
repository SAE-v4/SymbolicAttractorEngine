// src/engine/EngineClock.ts
export class EngineClock {
  private last = performance.now();
  bpm?: number; // optional global tempo
  tick(): number {
    const now = performance.now();
    const dt = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    return dt;
  }
}