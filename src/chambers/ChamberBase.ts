// src/chambers/ChamberBase.ts

export interface ChamberServices {
  audio?: { onBeat?: (cb: (t:number)=>void) => void };
  time?: { getPhase: () => number; setPhaseSpeed: (v:number)=>void };
}

export abstract class ChamberBase {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected services?: ChamberServices;

  constructor(canvas: HTMLCanvasElement, services?: ChamberServices) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;
    this.services = services;
    this.resize();
    addEventListener("resize", this.resize, { passive: true });
  }

  destroy() {
    removeEventListener("resize", this.resize as any);
  }

 protected vp = { w: 0, h: 0, dpr: 1 };

  protected resize = () => {
    const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // now draw in CSS px
    this.vp = { w: rect.width, h: rect.height, dpr };
    this.onResize();
  };

  // optional override points
  protected onResize() {}
  abstract update(dt: number): void;
  abstract render(dt: number): void;
  setWitnessFacing?(dx:number, dy:number): void;
thrustWitness?(amt:number): void;
getWitnessPos?(): { x:number; y:number };
onBeatQuarter?(): void;   // optional beat hooks
onBeatDownbeat?(): void;
}
