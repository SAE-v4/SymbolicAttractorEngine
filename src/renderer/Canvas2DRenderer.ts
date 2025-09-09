import { IRenderer, Color } from "./Irenderer"

export class Canvas2DRenderer implements IRenderer {
  private ctx: CanvasRenderingContext2D;
  private w = 1; private h = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
  }

  resize(widthPx: number, heightPx: number) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(widthPx * dpr));
    this.canvas.height = Math.max(1, Math.floor(heightPx * dpr));
    this.canvas.style.width = widthPx + "px";
    this.canvas.style.height = heightPx + "px";
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.w = widthPx; this.h = heightPx;
  }

  beginFrame() {}
  endFrame() {}

  clear(color: Color = "#0a0d12") {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  setAlpha(a: number) { this.ctx.globalAlpha = a; }
  setStroke(color: Color, widthPx: number, dash?: number[]) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = widthPx;
    this.ctx.setLineDash(dash ?? []);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }
  setFill(color: Color) { this.ctx.fillStyle = color; }

  private nx(x: number) { return x * this.w; }
  private ny(y: number) { return y * this.h; }
  private nr(r: number) { return r * Math.min(this.w, this.h); }

  lineNDC(x1: number, y1: number, x2: number, y2: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(this.nx(x1), this.ny(y1));
    c.lineTo(this.nx(x2), this.ny(y2));
    c.stroke();
  }

circleNDC(x: number, y: number, rNdc: number, fill = false) {
  // clamp radius to a tiny epsilon in NDC-space
  const rClamped = Math.max(0.0001, rNdc);
  const c = this.ctx;
  c.beginPath();
  c.arc(this.nx(x), this.ny(y), this.nr(rClamped), 0, Math.PI * 2);
  fill ? c.fill() : c.stroke();
}


  pathMoveNDC(x: number, y: number) { this.ctx.beginPath(); this.ctx.moveTo(this.nx(x), this.ny(y)); }
  pathLineNDC(x: number, y: number) { this.ctx.lineTo(this.nx(x), this.ny(y)); }
  pathStroke() { this.ctx.stroke(); }
}
