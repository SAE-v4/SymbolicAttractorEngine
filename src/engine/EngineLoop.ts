// src/engine/EngineLoop.ts

export type TickFn = (dt: number) => void;

export class EngineLoop {
  private rafId = 0;
  private running = false;
  private last = 0;
  private readonly fixedStep = 1 / 60; // 60 Hz sim
  private accumulator = 0;
  private onUpdate: TickFn;
  private onRender: TickFn;

  constructor(opts: { onUpdate: TickFn; onRender: TickFn }) {
    this.onUpdate = opts.onUpdate;
    this.onRender = opts.onRender;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now() / 1000;
    const loop = () => {
      if (!this.running) return;
      const now = performance.now() / 1000;
      let dt = now - this.last;
      if (dt > 0.25) dt = 0.25; // avoid spiral of death
      this.last = now;

      this.accumulator += dt;
      while (this.accumulator >= this.fixedStep) {
        this.onUpdate(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }
      const alpha = Math.min(1, this.accumulator / this.fixedStep);
      this.onRender(alpha);
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
