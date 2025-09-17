// Breath-driven radar rings with simple ripple + echo stubs.
// Slot it into <sae-card-chamber slot="radar">…</sae-card-chamber>

import type { BreathPhase } from "@/types/Core";

type LocalBreath = {
  phase: BreathPhase;
  value: number;   // 0..1 within phase (0.5 during pause)
  bpm: number;
  tGlobal: number;
};

export class WitnessRadarEl extends HTMLElement {
  private root: ShadowRoot;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private ro?: ResizeObserver;

  // style tokens (customizable via CSS variables on host)
  private get color()      { return getComputedStyle(this).getPropertyValue("--radar-color").trim()     || "oklch(0.82 0.04 240)"; }
  private get alphaBase()  { return +(getComputedStyle(this).getPropertyValue("--radar-alpha").trim()   || "0.25"); }
  private get lineWidth()  { return +(getComputedStyle(this).getPropertyValue("--radar-line").trim()    || "1"); }
  private get ringCount()  { return +(getComputedStyle(this).getPropertyValue("--radar-rings").trim()   || "6"); }
  private get paddingPct() { return +(getComputedStyle(this).getPropertyValue("--radar-padding").trim() || "0.1"); } // 10% inset

  // animation state
  private lastBreath: LocalBreath | null = null;
  private rippleT: number | null = null;      // seconds since ripple start, null when idle
  private echoes: Array<{ rNorm: number; t: number }> = []; // small ring blips (0..1 radius, time)

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = `
      <style>
        :host { display:block; width:100%; height:100%; }
        canvas { display:block; width:100%; height:100%; }
      </style>
      <canvas></canvas>
    `;
  }

  connectedCallback() {
    this.canvas = this.root.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d");

    const resize = () => this.resizeCanvas();
    resize();
    this.ro = new ResizeObserver(resize);
    this.ro.observe(this);

    // accept chamber broadcast
    this.addEventListener("card-breath" as any, this.onCardBreath as any);
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    this.removeEventListener("card-breath" as any, this.onCardBreath as any);
  }

  // External API (optional): allow chamber to call directly
  public applyBreath(b: LocalBreath) {
    this.lastBreath = b;
    this.stepAnimations(b);
    this.draw(b);
  }

  // Trigger a pulse ripple (e.g., on gesture/coherence)
  public ripple() {
    this.rippleT = 0;
  }

  // Add a tiny echo ring at a radius (0..1)
  public echo(radiusNorm: number) {
    this.echoes.push({ rNorm: Math.max(0, Math.min(1, radiusNorm)), t: 0 });
  }

  // --- internals -------------------------------------------------------------

  private onCardBreath = (ev: Event) => {
    const ce = ev as CustomEvent<LocalBreath>;
    if (!ce.detail) return;
    this.applyBreath(ce.detail);
  };

  private resizeCanvas() {
    const rect = this.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      // redraw with last state
      if (this.lastBreath) this.draw(this.lastBreath);
    }
  }

  private stepAnimations(b: LocalBreath) {
    // advance ripple timer using global time delta (approx)
    if (this.rippleT != null) {
      // 0.0 → 1.2 over ~0.9s @ 6 bpm (scale with bpm slightly)
      const speed = 1.0 + (b.bpm ? (b.bpm - 6) * 0.03 : 0);
      this.rippleT += (1 / 60) * speed;
      if (this.rippleT > 1.2) this.rippleT = null;
    }

    // advance echoes (fade out over ~2s)
    for (const e of this.echoes) e.t += 1 / 60;
    this.echoes = this.echoes.filter(e => e.t < 2.0);
  }

  private draw(b: LocalBreath) {
    const ctx = this.ctx;
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const W = this.canvas.width;
    const H = this.canvas.height;
    const w = W / dpr;
    const h = H / dpr;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.scale(dpr, dpr);

    const cx = w / 2, cy = h / 2;
    const pad = Math.min(w, h) * this.paddingPct;
    const maxR = Math.max(1, Math.min(w, h) * 0.5 - pad);

    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.color;

    // base rings
    const rings = Math.max(1, Math.floor(this.ringCount));
    for (let i = 0; i < rings; i++) {
      // 0..1 across rings
      const t = (i + 1) / (rings + 1);

      // subtle breath wobble (inhale brighten, exhale darken)
      const alphaPhase =
        b.phase === "inhale" ? this.alphaBase + 0.06 * (b.value - 0.5) :
        b.phase === "exhale" ? this.alphaBase - 0.04 * (b.value - 0.5) :
        this.alphaBase;

      // slight pulsation of radius with breath
      const r = t * maxR * (1.0 + 0.02 * Math.sin(b.value * Math.PI));

      ctx.globalAlpha = clamp01(alphaPhase);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ripple (expanding brighter ring)
    if (this.rippleT != null) {
      const rt = this.rippleT;                       // 0..1.2
      const r = rt * maxR;
      const a = 0.25 * Math.max(0, 1 - (rt - 0.1) / 0.9); // fade out
      if (r > 4) {
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // echoes (small blips that fade)
    for (const e of this.echoes) {
      const r = e.rNorm * maxR;
      const a = 0.2 * Math.max(0, 1 - e.t / 2);
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// utils
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

if (!customElements.get("sae-witness-radar")) {
  customElements.define("sae-witness-radar", WitnessRadarEl);
}

declare global {
  interface HTMLElementTagNameMap { "sae-witness-radar": WitnessRadarEl; }
}
