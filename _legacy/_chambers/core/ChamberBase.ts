// src/chambers/core/ChamberBase.ts
import type { Services } from "./Services";

export abstract class ChamberBase {
  protected ctx: CanvasRenderingContext2D;
  protected vp = { w: 0, h: 0, dpr: 1 };
  protected services?: Services;

  constructor(protected canvas: HTMLCanvasElement, services?: Services) {
    const c = canvas.getContext("2d");
    if (!c) throw new Error("2D context not available");
    this.ctx = c;
    this.services = services;
    this.resize();
    addEventListener("resize", this.resize, { passive: true });
  }

  destroy() {
    removeEventListener("resize", this.resize as any);
  }

  protected onResize() {}

  protected resize = () => {
    const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = Math.floor(rect.width  * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px
    this.vp = { w: rect.width, h: rect.height, dpr };
    this.onResize();
  };

  // Required
  abstract update(dt: number): void;
  abstract render(alpha: number): void;

  // Optional hooks (chambers implement only what they need)
  onBeat?(): void;
  setPhaseSpeed?(cyclesPerSecond: number): void;
  setWitnessFacing?(dx: number, dy: number): void;
  thrustWitness?(amt?: number): void;
  getWitnessPos?(): { x: number; y: number };
}
