// src/chambers/core/ChamberBase.ts

import type { Services } from "./services";

export abstract class ChamberBase {
  protected ctx: CanvasRenderingContext2D;
  protected vp = { w: 0, h: 0, dpr: 1 };
  constructor(protected canvas: HTMLCanvasElement, protected services?: Services) {
    const c = canvas.getContext("2d"); if (!c) throw new Error("2D ctx");
    this.ctx = c; this.resize(); addEventListener("resize", this.resize, { passive:true });
  }
  destroy(){ removeEventListener("resize", this.resize as any); }
  protected resize = () => {
    const dpr = Math.max(1, Math.min(2, devicePixelRatio||1));
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(r.width*dpr); this.canvas.height = Math.floor(r.height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0); this.vp = { w:r.width, h:r.height, dpr }; this.onResize();
  };
  protected onResize() {}
  abstract update(dt:number): void;
  abstract render(alpha:number): void;
}
