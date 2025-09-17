// src/chambers/card/components/CardLayoutChamber.ts
import type { EngineTick, BreathPhase } from "@/types/Core";

type LocalBreath = {
  phase: BreathPhase;
  /** 0..1 progression within current phase (inhale/exhale), 0.5 during pause */
  value: number;
  bpm: number;
  tGlobal: number;
};

export class CardLayoutChamberEl extends HTMLElement {
  // Refs (fallbacks only; slotted nodes are discovered via slots)
  private bg!: HTMLDivElement;
  private auraFallback!: HTMLDivElement | null;
  private radarCanvasFallback!: HTMLCanvasElement | null;
  private vesselLayer!: HTMLDivElement; // container for the vessel slot
  private overlayFallback!: HTMLDivElement | null;
  private archiveEl!: HTMLDivElement;

  // tiny state demo
  private currentGlyphId: string = "heart";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
  <style>
    :host { display:block; position:relative; contain:content; }
    .stack { position: relative; min-height: 340px; border-radius: 16px; overflow: clip;
             box-shadow: 0 10px 30px rgba(0,0,0,.25); }
    .layer { position:absolute; inset:0; }
    #bg     { background: oklch(0.12 0.02 260); }
    #aura   { pointer-events:none; }
    #radar  { width:100%; height:100%; display:block; pointer-events:none; }
    #vessel-layer { display:grid; place-items:center; }
    #overlay{ pointer-events:none; }
    #archive{ position:absolute; right:12px; bottom:12px; font:12px/1.2 ui-monospace,monospace; color:#9aa; }
  </style>

  <div id="bg" class="stack">
    <div class="layer">
      <slot name="bg">
        <!-- Fallback: flat color comes from chamber if nothing is slotted -->
        <div class="bg-fallback layer"></div>
      </slot>
    </div>

    <!-- Aura -->
    <div class="layer">
      <slot name="aura"><div id="aura"></div></slot>
    </div>

    <!-- Radar -->
    <div class="layer">
      <slot name="radar"><canvas id="radar"></canvas></slot>
    </div>

    <!-- Vessel -->
    <div class="layer" id="vessel-layer">
      <slot name="vessel"><sae-focus-vessel id="fv-fallback"></sae-focus-vessel></slot>
    </div>

    <div class="layer">
      <slot name="overlay">
        <!-- Fallback overlay (empty) -->
        <div id="overlay"></div>
      </slot>
    </div>

    <div id="archive">
      <slot name="archive">(archive)</slot>
    </div>
  </div>
`;

    // Fallback refs (may be null if slot is populated)
    this.bg = this.shadowRoot!.querySelector<HTMLDivElement>("#bg")!;
    this.auraFallback = this.shadowRoot!.querySelector<HTMLDivElement>("#aura");
    this.radarCanvasFallback = this.shadowRoot!.querySelector<HTMLCanvasElement>("#radar");
    this.vesselLayer = this.shadowRoot!.querySelector<HTMLDivElement>("#vessel-layer")!;
    this.overlayFallback = this.shadowRoot!.querySelector<HTMLDivElement>("#overlay");
    this.archiveEl = this.shadowRoot!.querySelector<HTMLDivElement>("#archive")!;

    // Listen to engine ticks
    this.addEventListener("engine-tick" as any, this.onEngineTick as any);

    // Resize fallback radar canvas now + on resize (DPR-aware)
    const resize = () => {
      const rect = this.bg.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      if (this.radarCanvasFallback) {
        this.radarCanvasFallback.width = Math.max(1, Math.floor(rect.width * dpr));
        this.radarCanvasFallback.height = Math.max(1, Math.floor(rect.height * dpr));
      }
      // Slotted radar element sizes itself.
    };
    resize();
    new ResizeObserver(resize).observe(this.bg);

    // Hook up tap → cycle on the vessel (works for slotted OR fallback)
    this.getVesselElements().forEach((v) => {
      v.addEventListener("vessel-tap", this.onVesselTap);
    });
  }

  disconnectedCallback() {
    this.removeEventListener("engine-tick" as any, this.onEngineTick as any);
    this.getVesselElements().forEach((v) => {
      v.removeEventListener("vessel-tap", this.onVesselTap);
    });
  }

  /** Optional direct wiring hook from engine-root (same normalization). */
  public onBreathTick(detail: EngineTick) {
    this.applyBreath(normalizeBreath(detail));
  }

  private onEngineTick = (ev: Event) => {
    const ce = ev as CustomEvent<EngineTick>;
    if (!ce.detail) return;
    this.applyBreath(normalizeBreath(ce.detail));
  };

  // ---- interactions ----------------------------------------------------------

  private onVesselTap = () => {
    // cycle glyph
    this.currentGlyphId =
      this.currentGlyphId === "heart" ? "spiral" :
      this.currentGlyphId === "spiral" ? "zigzag" : "heart";

    // reflect to whichever vessel is active
    this.getVesselElements().forEach((v) => {
      (v as any).glyph = this.currentGlyphId;
    });
  };

  // ---- rendering & routing ---------------------------------------------------

  private applyBreath(b: LocalBreath) {
    // 1) Forward to children first (so slotted components can react)
    this.forwardBreathToChildren(b);

    // 2) Background modulation (palette stub)
    this.bg.style.background = breathBgColor(b);

    // 3) Fallback radar draw—only if NO slotted radar is present
    if (!this.hasSlotted("radar") && this.radarCanvasFallback) {
      this.drawRadarFallback(this.radarCanvasFallback, b.tGlobal);
    }
  }

  private drawRadarFallback(canvas: HTMLCanvasElement, tSec: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const wCss = canvas.width / dpr;
    const hCss = canvas.height / dpr;

    ctx.translate(wCss / 2, hCss / 2);
    ctx.globalAlpha = 0.25;

    const maxR = Math.min(wCss, hCss) * 0.45;
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

private forwardBreathToChildren(b: LocalBreath) {
  const ev = new CustomEvent("card-breath", { detail: b, bubbles: true, composed: true });
  this.dispatchEvent(ev);

  const callApply = (el: Element | null) => {
    if (!el) return;
    const anyEl = el as any;
    if (typeof anyEl.applyBreath === "function") anyEl.applyBreath(b);
  };

  // vessel
  this.getVesselElements().forEach(callApply);

  // NEW: bg (slotted)
  const bgSlot = this.getSlot("bg");
  bgSlot?.assignedElements().forEach(callApply);

  // radar
  const radarSlot = this.getSlot("radar");
  radarSlot?.assignedElements().forEach(callApply);

  // aura
  const auraSlot = this.getSlot("aura");
  auraSlot?.assignedElements().forEach(callApply);

  // overlay
  const overlaySlot = this.getSlot("overlay");
  overlaySlot?.assignedElements().forEach(callApply);
}


  // ---- slot helpers ----------------------------------------------------------

  private getSlot(name: string): HTMLSlotElement | null {
    return this.shadowRoot!.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null;
  }

  private hasSlotted(name: string): boolean {
    const s = this.getSlot(name);
    return !!s && s.assignedElements().length > 0;
  }

  private getVesselElements(): Element[] {
    const s = this.getSlot("vessel");
    if (s) {
      const els = s.assignedElements();
      if (els.length) return els;
    }
    // fallback
    const fallback = this.shadowRoot!.getElementById("fv-fallback");
    return fallback ? [fallback] : [];
  }
}

// --- helpers -----------------------------------------------------------------

/** EngineTick (value ∈ [-1, +1]) → LocalBreath (0..1 within phase). */
function normalizeBreath(detail: EngineTick): LocalBreath {
  const { phase, bpm, value: v } = detail.breath;
  const v01 = (v + 1) / 2; // -1..+1 → 0..1
  const value =
    phase === "inhale" ? v01 :
    phase === "exhale" ? 1 - v01 :
    0.5;
  return { phase, value, bpm, tGlobal: detail.time };
}

/** Dev-only background modulation; to be replaced by Palette.withBreathPhase(..) */
function breathBgColor(b: LocalBreath): string {
  const dl = b.phase === "inhale" ? 0.03 * b.value : b.phase === "exhale" ? -0.02 * b.value : 0;
  const dc = b.phase === "exhale" ? 0.02 * b.value : 0;
  const l = clamp01(0.12 + dl);
  const c = clamp01(0.02 + dc);
  return `oklch(${l.toFixed(4)} ${c.toFixed(4)} 240)`;
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
