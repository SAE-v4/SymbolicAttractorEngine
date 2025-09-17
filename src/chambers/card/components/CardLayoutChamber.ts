/**
 * CardLayoutChamber — minimal orchestrator for the Card layout vertical slice.
 * - Owns the layer stack and routes breath → children (for now, inline stubs).
 * - Accepts breath via:
 *   1) CustomEvent<BreathTick> named "breath-tick" or "engine-tick" (from <engine-root>), or
 *   2) Direct method call onBreathTick(...),
 *   3) Internal RAF synthesizer (dev fallback).
 *
 * Replace inline bits with dedicated components (FocusVessel, BeingAura, WitnessRadar)
 * as you flesh out the slice; the DOM structure already mirrors that layering.
 */

export type BreathPhase = "inhale" | "pause" | "exhale";
export interface BreathTick {
  phase: BreathPhase;
  value: number;     // 0..1 progression within phase
  velocity: number;  // -1..+1
  bpm: number;
  tGlobal: number;   // seconds
}

export class CardLayoutChamberEl extends HTMLElement {
  private raf?: number;

  // Layer refs
  private bg!: HTMLDivElement;
  private auraLayer!: HTMLDivElement;
  private radarLayer!: HTMLCanvasElement;
  private vesselLayer!: HTMLDivElement;
  private overlayLayer!: HTMLDivElement;
  private archiveEl!: HTMLDivElement;

  // simple state stub
  private currentGlyphId: string = "heart";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // Markup
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display:block; position:relative; contain:content; }
        .stack { position: relative; min-height: 340px; border-radius: 16px; overflow: clip;
                 box-shadow: 0 10px 30px rgba(0,0,0,.25); }
        .layer { position:absolute; inset:0; }
        #bg     { background: oklch(0.12 0.02 260); }
        #aura   { pointer-events:none; }
        #radar  { width:100%; height:100%; display:block; pointer-events:none; }
        #vessel { display:grid; place-items:center; }
        #overlay{ pointer-events:none; }
        #archive{ position:absolute; right:12px; bottom:12px; font:12px/1.2 ui-monospace,monospace; color:#9aa; }
        .pill   { color:white; width:78px; height:78px; border-radius:999px;
                  outline:1px solid rgba(255,255,255,.18); display:grid; place-items:center;
                  font:600 12px ui-sans-serif; user-select:none; }
      </style>
      <div id="bg" class="stack">
        <div id="aura" class="layer"></div>
        <canvas id="radar" class="layer"></canvas>
        <div id="vessel" class="layer"></div>
        <div id="overlay" class="layer"></div>
        <div id="archive">(archive)</div>
      </div>
    `;

    // Refs
    this.bg = this.shadowRoot!.querySelector<HTMLDivElement>("#bg")!;
    this.auraLayer = this.shadowRoot!.querySelector<HTMLDivElement>("#aura")!;
    this.radarLayer = this.shadowRoot!.querySelector<HTMLCanvasElement>("#radar")!;
    this.vesselLayer = this.shadowRoot!.querySelector<HTMLDivElement>("#vessel")!;
    this.overlayLayer = this.shadowRoot!.querySelector<HTMLDivElement>("#overlay")!;
    this.archiveEl = this.shadowRoot!.querySelector<HTMLDivElement>("#archive")!;

    // Simple vessel content (replace with <sae-focus-vessel> later)
    this.renderVessel();

    // Wire engine events (works with your engine-root if it dispatches custom events)
    this.addEventListener("breath-tick" as any, this.onBreathEvent as any);
    this.addEventListener("engine-tick" as any, this.onBreathEvent as any);

    // Resize radar canvas now + on resize
    const resize = () => {
      const rect = this.bg.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      this.radarLayer.width = Math.max(1, rect.width * dpr);
      this.radarLayer.height = Math.max(1, rect.height * dpr);
      this.drawRadar(0); // clear
    };
    resize();
    new ResizeObserver(resize).observe(this.bg);

    // Fallback RAF synth so it animates without engine wiring
    const loop = (t: number) => {
      const b = synthesizeBreath(t);
      this.applyBreath(b);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);

    // tiny demo interaction: click to rotate current glyph
    this.addEventListener("click", () => {
      this.currentGlyphId = this.currentGlyphId === "heart" ? "spiral" : this.currentGlyphId === "spiral" ? "zigzag" : "heart";
      this.renderVessel();
    });
  }

  disconnectedCallback() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.removeEventListener("breath-tick" as any, this.onBreathEvent as any);
    this.removeEventListener("engine-tick" as any, this.onBreathEvent as any);
  }

  /** If you prefer direct wiring from engine-root, call this each tick */
  public onBreathTick(breath: BreathTick) {
    this.applyBreath(breath);
  }

  /** Internal event bridge: accepts CustomEvent<{breath:BreathTick}|BreathTick> */
  private onBreathEvent = (ev: Event) => {
    const ce = ev as CustomEvent<any>;
    const payload = ce.detail?.breath ?? ce.detail ?? null;
    if (payload && typeof payload === "object" && "phase" in payload) {
      this.applyBreath(payload as BreathTick);
    }
  };

  // ---- rendering & routing ---------------------------------------------------

  private renderVessel() {
    // Replace with <sae-focus-vessel> + SvgGlyph later
    this.vesselLayer.innerHTML = `
      <div class="pill" id="glyph-pill">${this.currentGlyphId}</div>
    `;
  }

  private applyBreath(b: BreathTick) {
    // Background modulation (palette adapter to come later)
    const bg = breathBgColor(b);
    this.bg.style.background = bg;

    // Vessel modulation
    const s = 0.96 + 0.08 * Math.sin(b.value * Math.PI);                   // scale
    const o = 0.85 + 0.15 * (b.phase === "inhale" ? b.value : 1 - b.value); // opacity
    const pill = this.shadowRoot!.getElementById("glyph-pill") as HTMLDivElement | null;
    if (pill) {
      pill.style.transform = `scale(${s})`;
      pill.style.opacity = String(o);
    }

    // Radar ripple (simple breathing rings)
    this.drawRadar(b.tGlobal);
  }

  private drawRadar(tSec: number) {
    const ctx = this.radarLayer.getContext("2d");
    if (!ctx) return;
    const w = this.radarLayer.width;
    const h = this.radarLayer.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.globalAlpha = 0.25;

    const maxR = Math.min(w, h) * 0.45;
    for (let i = 0; i < 6; i++) {
      const r = (i + 1) * (maxR / 7);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = `oklch(0.82 0.04 ${240 + ((tSec * 40) % 30)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// --- helpers -----------------------------------------------------------------

/** Dev-only background modulation; will be replaced by Palette.withBreathPhase(..) */
function breathBgColor(b: BreathTick): string {
  // Witness-ish cool tone; nudge lightness/chroma gently with phase
  const dl = b.phase === "inhale" ? 0.03 * b.value : b.phase === "exhale" ? -0.02 * b.value : 0;
  const dc = b.phase === "exhale" ? 0.02 * b.value : 0;
  const l = clamp01(0.12 + dl);
  const c = clamp01(0.02 + dc);
  // Use a cool hue ~240
  return `oklch(${l.toFixed(4)} ${c.toFixed(4)} 240)`;
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

/** Simple breath synthesizer so the chamber animates before engine wiring */
function synthesizeBreath(tMs: number): BreathTick {
  const t = tMs / 1000;
  const bpm = 6;
  const period = 60 / bpm; // seconds
  const x = (t % period) / period; // 0..1
  const phase: BreathPhase = x < 0.45 ? "inhale" : x < 0.55 ? "pause" : "exhale";
  const value = phase === "inhale" ? x / 0.45 : phase === "pause" ? 0.5 : (1 - x) / 0.45;
  const velocity = phase === "inhale" ? +1 : phase === "pause" ? 0 : -1;
  return { phase, value, velocity, bpm, tGlobal: t };
}
