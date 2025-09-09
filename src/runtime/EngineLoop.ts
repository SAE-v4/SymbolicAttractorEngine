export class EngineLoop {
  private rafId = 0;
  private last = 0;
  private running = false;
  constructor(private onTick: (t: number, dt: number) => void) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const step = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000)); // clamp 50ms
      this.last = t;
      this.onTick(t, dt);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
