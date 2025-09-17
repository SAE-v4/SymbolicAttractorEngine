// Soft, breath-synced aura behind the being's chest locus.
// Drop into <sae-card-chamber slot="aura">…</sae-card-chamber>

import type { BreathPhase } from "@/types/Core";

type LocalBreath = {
  phase: BreathPhase;
  value: number;   // 0..1 within phase (0.5 during pause)
  bpm: number;
  tGlobal: number;
};

type OutcomeKind = "reject" | "accept" | "harmonic";

export class BeingAuraEl extends HTMLElement {
  private root: ShadowRoot;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private ro?: ResizeObserver;

  // chest locus in CSS px (normalized from component bounds on resize)
  private cx = 0;
  private cy = 0;

  // visual radii (computed from size)
  private rCore = 12;     // chest circle
  private rGlow = 120;    // falloff radius

  // animation state
  private lastBreath: LocalBreath | null = null;

  // reaction FX
  private fx: Array<{ kind: OutcomeKind; t: number }> = [];

  // CSS variables (theme-able)
  private get colCore()  { return readVar(this, "--aura-core",  "oklch(0.78 0.08 25)"); }   // chest ring
  private get colGlow()  { return readVar(this, "--aura-glow",  "oklch(0.70 0.06 25)"); }   // inner glow
  private get colRing()  { return readVar(this, "--aura-ring",  "oklch(0.82 0.06 240)"); }  // faint outer ring
  private get alphaBase(){ return +readVar(this, "--aura-alpha","0.16"); }                  // base glow strength
  private get ringAlpha(){ return +readVar(this, "--aura-ring-alpha","0.12"); }

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

    const resize = () => this.resizeAndLayout();
    resize();
    this.ro = new ResizeObserver(resize);
    this.ro.observe(this);

    // listen to chamber’s broadcast
    this.addEventListener("card-breath" as any, this.onCardBreath as any);
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    this.removeEventListener("card-breath" as any, this.onCardBreath as any);
  }

  // --- public API ------------------------------------------------------------

  /** Chamber can call directly instead of broadcasting an event. */
  public applyBreath(b: LocalBreath) {
    this.lastBreath = b;
    this.stepFx();
    this.draw(b);
  }

  /** Set chest locus relative to this element (CSS px). Defaults to center. */
  public setChest(x: number, y: number) {
    this.cx = x; this.cy = y;
    if (this.lastBreath) this.draw(this.lastBreath);
  }

  /** Trigger a short glow reaction. */
  public react(kind: OutcomeKind) {
    this.fx.push({ kind, t: 0 });
  }

  // --- internals -------------------------------------------------------------

  private onCardBreath = (ev: Event) => {
    const ce = ev as CustomEvent<LocalBreath>;
    if (!ce.detail) return;
    this.applyBreath(ce.detail);
  };

  private resizeAndLayout() {
    const rect = this.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    // chest locus defaults to center of element
    this.cx = rect.width / 2;
    this.cy = rect.height / 2;

    // radii scale with the shorter side
    const s = Math.min(rect.width, rect.height);
    this.rCore = Math.max(8, Math.floor(s * 0.028));
    this.rGlow = Math.max(40, Math.floor(s * 0.32));

    if (this.lastBreath) this.draw(this.lastBreath);
  }

  private stepFx() {
    // advance, drop finished ~0.8–1.2s depending on kind
    for (const f of this.fx) f.t += 1 / 60;
    this.fx = this.fx.filter(f => f.t < (f.kind === "harmonic" ? 1.2 : 0.8));
  }

  private draw(b: LocalBreath) {
    const ctx = this.ctx; if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const W = this.canvas.width, H = this.canvas.height;
    const w = W / dpr, h = H / dpr;

    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.scale(dpr, dpr);

    // computed centers in CSS px
    const cx = this.cx, cy = this.cy;

    // --- base glow (breath synced)
    // inhale brightens, exhale softens
    const breathA =
      b.phase === "inhale" ? this.alphaBase + 0.10 * b.value :
      b.phase === "exhale" ? this.alphaBase - 0.06 * b.value :
      this.alphaBase;

    const r0 = this.rCore * (1.0 + 0.06 * Math.sin(b.value * Math.PI)); // tiny pulse
    const r1 = this.rGlow * (1.0 + 0.02 * Math.sin(b.value * Math.PI));

    const grad = ctx.createRadialGradient(cx, cy, Math.max(1, r0*0.5), cx, cy, r1);
    grad.addColorStop(0.0, withAlpha(this.colGlow, clamp01(breathA * 0.9)));
    grad.addColorStop(0.45, withAlpha(this.colGlow, clamp01(breathA * 0.35)));
    grad.addColorStop(1.0, withAlpha(this.colGlow, 0.0));

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI*2);
    ctx.fill();

    // --- chest ring
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = this.colCore;
    ctx.lineWidth = Math.max(1, Math.floor(this.rCore * 0.18));
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, r0, 0, Math.PI * 2);
    ctx.stroke();

    // subtle outer ring
    ctx.strokeStyle = this.colRing;
    ctx.globalAlpha = this.ringAlpha;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r1 * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // --- reaction FX
    for (const f of this.fx) {
      switch (f.kind) {
        case "reject":   this.drawReject(ctx, cx, cy, r0, f.t); break;
        case "accept":   this.drawAccept(ctx, cx, cy, r0, f.t); break;
        case "harmonic": this.drawHarmonic(ctx, cx, cy, r0, f.t); break;
      }
    }

    ctx.restore();
  }

  private drawAccept(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, t: number) {
    // short bright flash ring expanding
    const r = r0 + 16 + 90 * easeOutCubic(Math.min(1, t / 0.6));
    const a = 0.25 * (1 - Math.min(1, t / 0.6));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = this.colCore;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawReject(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, t: number) {
    // quick cross X that fades
    const L = r0 + 24;
    const a = 0.22 * (1 - Math.min(1, t / 0.45));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = this.colRing;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - L, cy - L); ctx.lineTo(cx + L, cy + L);
    ctx.moveTo(cx - L, cy + L); ctx.lineTo(cx + L, cy - L);
    ctx.stroke();
    ctx.restore();
  }

  private drawHarmonic(ctx: CanvasRenderingContext2D, cx: number, cy: number, r0: number, t: number) {
    // cross + bright inner pulse
    const a = 0.28 * (1 - Math.min(1, t / 1.0));
    const L = r0 + 28 + 18 * easeOutCubic(Math.min(1, t / 1.0));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = this.colCore;
    ctx.lineWidth = 2;
    ctx.beginPath(); // cross
    ctx.moveTo(cx - L, cy); ctx.lineTo(cx + L, cy);
    ctx.moveTo(cx, cy - L); ctx.lineTo(cx, cy + L);
    ctx.stroke();

    // bright pulse at chest
    const rp = r0 * (1.0 + 0.35 * Math.sin(Math.PI * Math.min(1, t)));
    ctx.globalAlpha = a * 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, rp, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// utils -----------------------------------------------------------------------

// utils -----------------------------------------------------------------------

function withAlpha(oklch: string, alpha: number) {
  // We keep color as-is and use ctx.globalAlpha externally.
  return oklch;
}

function readVar(el: Element, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name);
  return v && v.trim() ? v.trim() : fallback;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function easeOutCubic(x: number) { 
  return 1 - Math.pow(1 - x, 3); 
}

if (!customElements.get("sae-being-aura")) {
  customElements.define("sae-being-aura", BeingAuraEl);
}

declare global {
  interface HTMLElementTagNameMap { "sae-being-aura": BeingAuraEl; }
}
