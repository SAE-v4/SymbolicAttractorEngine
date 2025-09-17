// src/chambers/field/components/GestureLayer.ts
// Canvas-wide pointer capture + trace rendering (debug-forward).
// Emits `gesture:trace` and a simple `gesture:intent` for spiral detection.

import type { BreathPhase } from "@/types/Core";

type LocalBreath = { phase: BreathPhase; value: number; bpm: number; tGlobal: number };

export class GestureLayerEl extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private dpr = Math.max(1, devicePixelRatio || 1);

  private isDown = false;
  private path: Array<{ x:number; y:number; t:number }> = [];
  private fadeTrails = false; // default off for visibility

  static get observedAttributes() { return ["fade"]; }
  attributeChangedCallback(n:string,_o:string|null,v:string|null) {
    if (n === "fade") this.fadeTrails = v != null;
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          position:absolute; inset:0;
          display:block; touch-action:none; /* allow drawing */
          /* bring on top while debugging */
          z-index: 10;
          pointer-events: auto;
        }
        canvas { display:block; width:100%; height:100%; }
      </style>
      <canvas></canvas>
    `;
    this.canvas = this.shadowRoot!.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d");

    const resize = () => {
      const rect = this.getBoundingClientRect();
      this.canvas.width  = Math.max(1, Math.floor(rect.width  * this.dpr));
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
    // later: modulate line alpha/width with breath
  }

  // --- pointer handlers -------------------------------------------------------

  private onDown = (e: PointerEvent) => {
    this.isDown = true;
    this.path = [];
    this.setPointerCapture?.(e.pointerId);
    this.pushPoint(e);
    this.emit("gesture:trace", { kind:"start", path:this.path.slice(-1) });
  };

  private onMove = (e: PointerEvent) => {
    if (!this.isDown) return;
    this.pushPoint(e);
    this.emit("gesture:trace", { kind:"update", path:this.path.slice(-1) });
    this.draw();
  };

  private onUp = (e: PointerEvent) => {
    if (!this.isDown) return;
    this.isDown = false;
    this.pushPoint(e);
    this.releasePointerCapture?.(e.pointerId);
    const full = this.path.slice();
    this.emit("gesture:trace", { kind:"end", path: full });

    // naive spiral check on full trace
    const spiral = detectSpiral(full);
    if (spiral) this.emit("gesture:intent", spiral);

    this.draw(true);
  };

  private pushPoint(e: PointerEvent) {
    const r = this.getBoundingClientRect();
    this.path.push({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      t: performance.now()/1000
    });
    if (this.path.length > 1024) this.path.shift();
  }

  // --- rendering --------------------------------------------------------------

  private draw(final=false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    if (this.fadeTrails && !final) {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0,0,W,H);
    } else {
      ctx.clearRect(0,0,W,H);
    }

    if (this.path.length < 2) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.lineJoin = "round";
    ctx.lineCap  = "round";

    for (let i=1; i<this.path.length; i++) {
      const p0 = this.path[i-1], p1 = this.path[i];
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const dt = Math.max(1e-3, p1.t - p0.t);
      const v  = Math.hypot(dx, dy) / dt;               // px/sec
      const w  = 2 + Math.min(10, v * 0.02);            // thicker
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";        // bright for debug
      ctx.lineWidth = w;
      ctx.stroke();
    }

    // pointer head marker
    const head = this.path[this.path.length-1];
    ctx.beginPath();
    ctx.arc(head.x, head.y, 5, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,200,120,0.95)";
    ctx.fill();

    ctx.restore();
  }

  // --- utils ------------------------------------------------------------------

  private emit(type: string, detail: any) {
    // Quick visibility while we integrate:
    // eslint-disable-next-line no-console
    console.log(type, detail);
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles:true, composed:true }));
  }
}

/** Very simple spiral detector: accumulate signed turning angle.
 * If we exceed 1.75π in one direction over a minimum radius & samples,
 * treat it as a spiral. Returns null or an intent payload.
 */
function detectSpiral(path: Array<{x:number;y:number;t:number}>) {
  if (path.length < 24) return null;

  // build direction vectors
  let thetaSum = 0;
  let lastAng: number | null = null;
  let minR = Infinity, maxR = 0;

  const cx = path.reduce((a,p)=>a+p.x,0)/path.length;
  const cy = path.reduce((a,p)=>a+p.y,0)/path.length;

  for (let i=1; i<path.length; i++) {
    const a = Math.atan2(path[i].y - path[i-1].y, path[i].x - path[i-1].x);
    if (lastAng != null) {
      let d = a - lastAng;
      // unwrap to [-π, +π]
      if (d >  Math.PI) d -= Math.PI*2;
      if (d < -Math.PI) d += Math.PI*2;
      thetaSum += d;
    }
    lastAng = a;

    const r = Math.hypot(path[i].x - cx, path[i].y - cy);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }

  const laps = Math.abs(thetaSum) / (Math.PI*2);
  const dir  = thetaSum > 0 ? "ccw" : "cw";
  const radiusOk = (maxR - minR) > 20; // avoid tiny scribbles

  if (laps >= 0.9 && radiusOk) {
    return { type:"spiral", dir, laps: Number(laps.toFixed(2)) };
  }
  return null;
}

if (!customElements.get("sae-gesture-layer")) {
  customElements.define("sae-gesture-layer", GestureLayerEl);
}
