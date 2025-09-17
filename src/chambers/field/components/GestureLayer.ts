// Canvas-wide pointer capture + trace rendering (very light).
// Emits `gesture:trace` updates and (later) `gesture:intent`.

import type { BreathPhase } from "@/types/Core";

type LocalBreath = { phase: BreathPhase; value: number; bpm: number; tGlobal: number; };

export class GestureLayerEl extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private dpr = Math.max(1, devicePixelRatio || 1);

  private isDown = false;
  private path: Array<{x:number;y:number;t:number}> = [];
  private fadeTrails = true;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display:block; position:absolute; inset:0; touch-action:none; }
        canvas { display:block; width:100%; height:100%; }
      </style>
      <canvas></canvas>
    `;
    this.canvas = this.shadowRoot!.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d");

    const resize = () => {
      const rect = this.getBoundingClientRect();
      this.canvas.width  = Math.max(1, Math.floor(rect.width * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
    };
    new ResizeObserver(resize).observe(this);
    resize();

    this.addEventListener("pointerdown", this.onDown, { passive:false });
    this.addEventListener("pointermove", this.onMove, { passive:false });
    this.addEventListener("pointerup",   this.onUp,   { passive:false });
    this.addEventListener("pointercancel", this.onUp, { passive:false });
  }

  disconnectedCallback() {
    this.removeEventListener("pointerdown", this.onDown as any);
    this.removeEventListener("pointermove", this.onMove as any);
    this.removeEventListener("pointerup",   this.onUp   as any);
    this.removeEventListener("pointercancel", this.onUp as any);
  }

  applyBreath(_b: LocalBreath) {
    // Optionally modulate stroke alpha/width with breath
  }

  private onDown = (e: PointerEvent) => {
    this.isDown = true;
    this.path = [];
    this.setPointerCapture?.(e.pointerId);
    this.pushPoint(e);
    this.dispatch("gesture:trace", { kind:"start", path:this.path.slice(-1) });
  };

  private onMove = (e: PointerEvent) => {
    if (!this.isDown) return;
    this.pushPoint(e);
    this.dispatch("gesture:trace", { kind:"update", path:this.path.slice(-1) });
    this.draw();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.isDown) return;
    this.isDown = false;
    this.pushPoint(e);
    this.releasePointerCapture?.(e.pointerId);
    this.dispatch("gesture:trace", { kind:"end", path:this.path.slice() });
    this.draw(true);
  };

  private pushPoint(e: PointerEvent) {
    const rect = this.getBoundingClientRect();
    this.path.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now()/1000 });
    if (this.path.length > 512) this.path.shift();
  }

  private draw(final=false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;

    if (this.fadeTrails && !final) {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0,0,w,h);
    } else {
      ctx.clearRect(0,0,w,h);
    }

    if (this.path.length < 2) return;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";

    // simple velocity-based width
    for (let i=1; i<this.path.length; i++) {
      const p0 = this.path[i-1], p1 = this.path[i];
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const dt = Math.max(1e-3, p1.t - p0.t);
      const v = Math.hypot(dx, dy) / dt; // px/sec
      const wPx = 1 + Math.min(6, v * 0.01);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = "oklch(0.86 0.05 250)";
      ctx.lineWidth = wPx;
      ctx.stroke();
    }
    ctx.restore();
  }

  private dispatch(type: string, detail: any) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles:true, composed:true }));
  }
}
