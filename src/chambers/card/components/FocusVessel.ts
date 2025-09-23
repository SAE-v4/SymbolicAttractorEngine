// src/chambers/card/components/FocusVessel.ts
import type { BreathPhase } from "@/types/Core";
import { ensureSprite } from "../renderers/SvgSprite";

export type VesselBreath = {
  phase: BreathPhase;
  /** 0..1 within phase (inhale/exhale), 0.5 during pause */
  value: number;
  bpm: number;
  tGlobal: number;
};

export type GlyphSpecLite = {
  id: string;
  label?: string;
  svg?: string; // e.g. "#g-heart"
  colorKey?: string;
  breathAnim?: { scale?: [number, number]; opacity?: [number, number] };
};

const DEFAULT_ANIM = {
  scale: [0.96, 1.06] as [number, number],
  opacity: [0.85, 1.0] as [number, number],
};

export class FocusVesselEl extends HTMLElement {
  static get observedAttributes() { return ["glyph"]; }

  private root!: ShadowRoot;
  private vessel!: HTMLDivElement;
  private svgWrap!: HTMLDivElement;
  private labelEl!: HTMLDivElement;

  private _glyphId = "heart";
  private _spec: GlyphSpecLite | null = null;

  // drag state (skeleton for offering)
  private dragging = false;
  private dragStart?: { x: number; y: number };
  private dragPos?: { x: number; y: number };

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = `
      <style>
        :host { display:grid; place-items:center; touch-action:none; }
        .wrap { position:relative; width: 120px; height: 120px; }
        .hit { position:absolute; inset:0; border-radius:999px; cursor:grab; }
        .glyph {
          position:absolute; inset:0; display:grid; place-items:center;
          will-change: transform, opacity; pointer-events:none;
        }
        .fallback {
          color:white; width:78px; height:78px; border-radius:999px;
          outline:1px solid rgba(255,255,255,.18); display:grid; place-items:center;
          font:600 12px ui-sans-serif; user-select:none;
          background: rgba(255,255,255,0.04);
        }
        svg { width:54px; height:54px; display:block; color: oklch(0.92 0.07 25); }
        .drag-ghost {
          position:absolute; top:0; left:0; translate:-50% -50%;
          pointer-events:none; opacity:0; transition:opacity .12s ease-out;
        }
        .dragging .drag-ghost { opacity: 0.9; }
      </style>
      <div class="wrap" id="wrap">
        <div class="glyph" id="glyph">
          <div class="fallback" id="label">(glyph)</div>
        </div>
        <div class="drag-ghost" id="ghost"></div>
        <div class="hit" id="hit"></div>
      </div>
    `;

    ensureSprite(this.root);
    this.vessel   = this.root.getElementById("wrap")! as HTMLDivElement;
    this.svgWrap  = this.root.getElementById("glyph")! as HTMLDivElement;
    this.labelEl  = this.root.getElementById("label")! as HTMLDivElement;

    // pointer bindings
    const hit = this.root.getElementById("hit")!;
    hit.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    hit.addEventListener("pointerup", this.onPointerUp, { passive: true });
    hit.addEventListener("pointercancel", this.onPointerCancel, { passive: true });
    hit.addEventListener("pointermove", this.onPointerMove, { passive: true });
  }

  // --- attributes / properties ----------------------------------------------

  attributeChangedCallback(name: string, _o: string | null, v: string | null) {
    if (name === "glyph" && v) this.setGlyph(v);
  }

  get glyph() { return this._glyphId; }
  set glyph(id: string) { this.setGlyph(id); }

  /** Provide a richer spec (e.g., from glyphs.json). */
  set glyphSpec(spec: GlyphSpecLite | null) {
    this._spec = spec;
    if (spec?.id) this._glyphId = spec.id;
    this.renderGlyph();
  }

  /** Imperative glyph swap. */
  public setGlyph(id: string) {
    this._glyphId = id;
    // Keep current spec but reflect new id
    if (this._spec) this._spec.id = id;
    this.renderGlyph();
  }

  // --- breath routing ---------------------------------------------------------

  /** Chamber calls this each engine frame with phase-local breath. */
  public applyBreath(b: VesselBreath) {
    const anim = this._spec?.breathAnim ?? DEFAULT_ANIM;
    const s = lerp(anim.scale?.[0] ?? DEFAULT_ANIM.scale[0],
                   anim.scale?.[1] ?? DEFAULT_ANIM.scale[1],
                   Math.sin(b.value * Math.PI) * 0.5 + 0.5); // easey pulse
    const o = lerp(anim.opacity?.[0] ?? DEFAULT_ANIM.opacity[0],
                   anim.opacity?.[1] ?? DEFAULT_ANIM.opacity[1],
                   b.phase === "inhale" ? b.value : 1 - b.value);

    this.svgWrap.style.transform = `scale(${s})`;
    this.svgWrap.style.opacity = String(o);

    // If dragging, update ghost
    if (this.dragging && this.dragPos) {
      const ghost = this.root.getElementById("ghost") as HTMLDivElement;
      ghost.style.transform = `translate(${this.dragPos.x}px, ${this.dragPos.y}px)`;
    }
  }

  // --- rendering --------------------------------------------------------------

  private renderGlyph() {
    const id = this._glyphId;
    const spec = this._spec;
    const label = spec?.label ?? id;

    // Clear previous content
    this.svgWrap.innerHTML = "";

    const symbolRef = spec?.svg || defaultSymbolFor(id);
    const symbolId = symbolRef?.startsWith("#") ? symbolRef.slice(1) : null;
    const hasSymbol = symbolId ? this.root.getElementById(symbolId) != null : false;

    if (symbolRef && symbolRef.startsWith("#") && hasSymbol) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttributeNS("http://www.w3.org/1999/xlink", "href", symbolRef);
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.appendChild(use);
      this.svgWrap.appendChild(svg);
    } else {
      // Fallback text pill
      const pill = document.createElement("div");
      pill.className = "fallback";
      pill.textContent = label;
      this.svgWrap.appendChild(pill);
    }

    // Update fallback label (for accessibility / ghost)
    this.labelEl.textContent = label;
  }

  // --- pointer skeleton (tap + drag events) ----------------------------------

  private onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = this.vessel.getBoundingClientRect();
    this.dragging = true;
    this.vessel.classList.add("dragging");
    this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.dragPos = { ...this.dragStart };

    const ghost = this.root.getElementById("ghost") as HTMLDivElement;
    ghost.textContent = ""; // clear
    const g = document.createElement("div");
    g.className = "fallback";
    g.textContent = this._spec?.label ?? this._glyphId;
    ghost.appendChild(g);
    ghost.style.transform = `translate(${this.dragPos.x}px, ${this.dragPos.y}px)`;

    this.dispatchEvent(new CustomEvent("vessel-dragstart", {
      bubbles: true, composed: true,
      detail: { glyphId: this._glyphId, local: this.dragStart }
    }));
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging || !this.dragStart) return;
    const rect = this.vessel.getBoundingClientRect();
    this.dragPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.dispatchEvent(new CustomEvent("vessel-drag", {
      bubbles: true, composed: true,
      detail: { glyphId: this._glyphId, local: this.dragPos }
    }));
  };

  private onPointerUp = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const wasDragging = this.dragging;
    const start = this.dragStart;
    const end = this.dragPos;

    this.dragging = false;
    this.vessel.classList.remove("dragging");
    this.dragStart = undefined;
    this.dragPos = undefined;

    if (wasDragging && start && end) {
      const dx = end.x - start.x, dy = end.y - start.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        // Treat as a tap if essentially stationary
        this.dispatchEvent(new CustomEvent("vessel-tap", {
          bubbles: true, composed: true, detail: { glyphId: this._glyphId }
        }));
      }
      this.dispatchEvent(new CustomEvent("vessel-dragend", {
        bubbles: true, composed: true,
        detail: { glyphId: this._glyphId, local: end }
      }));
    }
  };

  private onPointerCancel = (_e: PointerEvent) => {
    this.dragging = false;
    this.vessel.classList.remove("dragging");
    this.dragStart = undefined;
    this.dragPos = undefined;
  };
}

// --- helpers -----------------------------------------------------------------

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Provide a tiny default mapping until you load real specs from glyphs.json
function defaultSymbolFor(id: string): string | undefined {
  switch (id) {
    case "heart": return "#g-heart";
    case "spiral": return "#g-spiral";
    case "zigzag": return "#g-zigzag";
    default: return undefined;
  }
}

if (!customElements.get("sae-focus-vessel")) {
  customElements.define("sae-focus-vessel", FocusVesselEl);
}

declare global {
  interface HTMLElementTagNameMap { "sae-focus-vessel": FocusVesselEl; }
}
