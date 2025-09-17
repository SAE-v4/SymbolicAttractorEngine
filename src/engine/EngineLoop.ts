// src/engine/EngineLoop.ts
export class EngineLoop {
  private raf: number | null = null;
  private last = 0;
  constructor(private onFrame: (tMs: number, dtSec: number) => void) {}
  start() {
    if (this.raf != null) return;
    const tick = (t: number) => {
      const dt = this.last ? (t - this.last) / 1000 : 0;
      this.last = t;
      this.onFrame(t, dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() {
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null; this.last = 0;
  }
}
