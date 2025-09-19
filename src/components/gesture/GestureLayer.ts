import type { TracePoint, GestureIntent } from "@/types/Gesture";
import { GestureEngine } from "@/systems/gesture/GestureEngine";

export class GestureLayerEl extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private dpr = Math.max(1, devicePixelRatio || 1);

  private isDown = false;
  private path: TracePoint[] = [];
  private engine = new GestureEngine();

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

    // classify now
    const intent: GestureIntent = this.engine.classify(this.path);
    this.dispatch("gesture:intent", intent);
  };

  private pushPoint(e: PointerEvent) {
    const rect = this.getBoundingClientRect();
    this.path.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now()/1000 });
    if (this.path.length > 1024) this.path.shift();
  }

  private draw(final=false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    // very light trail
    ctx.fillStyle = final ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(0,0,w,h);
    if (this.path.length < 2) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    for (let i=1; i<this.path.length; i++) {
      const p0 = this.path[i-1], p1 = this.path[i];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = "oklch(0.86 0.05 250)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  private dispatch(type: string, detail: any) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles:true, composed:true }));
  }
}

if (!customElements.get("sae-gesture-layer")) {
  customElements.define("sae-gesture-layer", GestureLayerEl);
}

declare global {
  interface HTMLElementTagNameMap { "sae-gesture-layer": GestureLayerEl; }
}
