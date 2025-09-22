// Field Bands Background — web component (Canvas2D)
// 
// What it does (white‑label):
// - Renders horizon (horizontal ribs) and crown (concentric rings) band textures
// - Colors by basis using a 3‑stop radial palette (center→mid→edge)
// - Breath-only demo: band brightness/contrast/desaturation respond to phase
// - Proximity-based morph: horizon↔crown blended by (1−rho)^γ
// - Exhale shear visualizes “conveyor” slip; scaled by temporal coherence C_time
// - Optional witness rings overlay (UI white)
// - Purely presentational. No knowledge of clusters/chords/diagrams.
//
// API
// -----
// Attributes (observed):
//   mode="horizon|crown|auto"   // default: "auto"
//   basis="neutral"             // selects palette family (can be extended)
//   bands="6.5"                 // visual frequency (horizon ~6.5, crown ~10.5)
//   show-witness="true|false"   // default: true
//
// Methods:
//   applyBreath(b: { phase: "inhale"|"hold-in"|"exhale"|"hold-out"; value:number; bpm:number; tGlobal:number; G?:number })
//     - G: optional temporal sync gain (0..1). If omitted in breath-only demo, defaults to 0.6
//   applyProximity(rho: number)  // 0 (center) .. 1 (edge). Drives horizon↔crown morph when mode="auto"
//   setPalette(p: { center:[number,number,number]; mid:[number,number,number]; edge:[number,number,number] })
//
// Usage:
//   import "./field-bands-bg";
//   const el = document.createElement("field-bands-bg");
//   el.setAttribute("mode", "auto");
//   el.setAttribute("basis", "neutral");
//   document.body.appendChild(el);
//   // pump breath frames from your clock:
//   el.applyBreath({ phase:"inhale", value:0.7, bpm:6, tGlobal:performance.now() });
//   // (optional) drive proximity to witness:
//   el.applyProximity(0.6);

export type BreathPhase = "inhale" | "hold-in" | "exhale" | "hold-out";

type LocalBreath = {
  phase: BreathPhase;
  value: number;   // 0..1 arbitrary ease of the phase (optional)
  bpm: number;     // breaths per minute (informational)
  tGlobal: number; // ms (informational)
  G?: number;      // temporal sync gain (0..1). If absent, we use demo default
};

export class FieldBandsBGEl extends HTMLElement {
  static get observedAttributes() { return ["mode", "basis", "bands", "show-witness"]; }

  // Attributes
  private mode: "horizon"|"crown"|"auto" = "auto";
  private basisKey: string = "neutral";
  private bandCount: number = 6.5; // horizon-ish default
  private showWitness: boolean = true;

  // Runtime state
  private breath: LocalBreath | null = null;
  private rho: number | null = null; // 0..1 center..edge
  private phaseDriftTime = 0; // ms

  // Palette (sRGB 0..1)
  private palette = {
    center: [1.00, 0.85, 0.29] as [number,number,number], // gold
    mid:    [0.24, 0.81, 0.56] as [number,number,number], // teal
    edge:   [0.12, 0.22, 0.54] as [number,number,number], // deep blue
  };

  private shadow!: ShadowRoot;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private resizeObs?: ResizeObserver;
  private raf = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>
        :host{position:absolute;inset:0;display:block;contain:strict}
        canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      </style>
      <canvas part="canvas"></canvas>
    `;
  }

  connectedCallback() {
    this.canvas = this.shadow.querySelector("canvas")!;
    const ctx = this.canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;

    // Initial DPR sizing
    this.resizeCanvas();
    this.resizeObs = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObs.observe(this.canvas);

    // Start animation loop (slow drift). In breath-only mode this keeps it alive.
    const loop = () => { this.phaseDriftTime = performance.now(); this.render(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  disconnectedCallback() {
    this.resizeObs?.disconnect();
    cancelAnimationFrame(this.raf);
  }

  attributeChangedCallback(name: string, _o: string|null, v: string|null) {
    if (name === "mode" && v) this.mode = (v as any);
    if (name === "basis" && v) this.basisKey = v;
    if (name === "bands" && v) this.bandCount = Number(v) || this.bandCount;
    if (name === "show-witness" && v !== null) this.showWitness = v !== "false";
    this.render();
  }

  // External API
  applyBreath(b: LocalBreath) { this.breath = b; this.render(); }
  applyProximity(rho: number) { this.rho = Math.max(0, Math.min(1, rho)); this.render(); }
  setPalette(p: { center:[number,number,number]; mid:[number,number,number]; edge:[number,number,number] }) { this.palette = p; this.render(); }

  // --- Core render ---
  private resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h; this.render();
    }
  }

  private render() {
    const ctx = this.ctx; if (!ctx) return;
    const W = this.canvas.width, H = this.canvas.height;
    if (W === 0 || H === 0) return;

    // --- Breath mapping ---
    const phase = this.breath?.phase ?? "inhale";
    const E = phaseWeight(phase);                 // 0..1
    const G = this.breath?.G ?? 0.6;              // demo default
    const C_time = clamp01(E * G);                // temporal coherence for background

    const isInhale = phase === "inhale" || phase === "hold-in";
    const brightness = isInhale ? 1.10 : 0.92;
    const desat      = isInhale ? 0.10 : 0.35;
    const baseContrast= isInhale ? 0.85 : 0.55;
    const contrast    = (phase === "hold-in") ? 0.75 : baseContrast; // hush at crest
    const shearBase   = (phase === "exhale" || phase === "hold-out") ? 0.02 : 0.0;
    const shear       = shearBase * (1 - C_time);

    // Carrier selection (horizon/crown/auto)
    const cx = W * 0.5, cy = H * 0.5;
    const rMax = Math.hypot(cx, cy);
    const bands = this.bandCount || (this.mode === "crown" ? 10.5 : 6.5);
    const t = this.phaseDriftTime * 0.00015; // slow drift
    const phi = 0.6 + t;

    // Morph factor M
    let M = 0; // 0..1 horizon→crown
    if (this.mode === "horizon") M = 0;
    else if (this.mode === "crown") M = 1;
    else {
      if (this.rho == null) {
        // fallback phase-based morph
        M = phaseMorph(phase); // small crown hush near crest
      } else {
        M = Math.pow(1 - clamp01(this.rho), 1.5); // (1−ρ)^γ
      }
    }

    // --- Draw bands into ImageData ---
    const img = ctx.createImageData(W, H);
    const data = img.data;

    for (let y = 0; y < H; y++) {
      const yn = y / (H - 1);
      for (let x = 0; x < W; x++) {
        // Shear on exhale (visual only)
        const xs = x + (y - cy) * shear;
        const xclamp = xs < 0 ? 0 : (xs >= W ? W - 1 : xs);

        const rx = xclamp - cx;
        const ry = y - cy;
        const r = Math.hypot(rx, ry) / rMax; // 0..1

        // Palette tri‑mix along radius
        const hue = triMix(this.palette.center, this.palette.mid, this.palette.edge, r);
        const gray = (hue[0] + hue[1] + hue[2]) / 3;
        let rC = hue[0] * (1 - desat) + gray * desat;
        let gC = hue[1] * (1 - desat) + gray * desat;
        let bC = hue[2] * (1 - desat) + gray * desat;
        rC *= brightness; gC *= brightness; bC *= brightness;

        // Carriers
        const carrierH = Math.sin(2 * Math.PI * (yn * bands) + phi);
        const carrierC = Math.sin(2 * Math.PI * (r  * bands) + phi);
        const carrier  = (1 - M) * carrierH + M * carrierC;

        // Band mask with contrast
        const bandMask = 0.75 + 0.25 * ((1 - contrast) + contrast * (0.5 + 0.5 * carrier));

        rC = clamp01(rC * bandMask);
        gC = clamp01(gC * bandMask);
        bC = clamp01(bC * bandMask);

        const idx = (y * W + x) * 4;
        data[idx + 0] = Math.round(rC * 255);
        data[idx + 1] = Math.round(gC * 255);
        data[idx + 2] = Math.round(bC * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    if (this.showWitness) this.drawWitnessRings();
  }

  private drawWitnessRings() {
    const ctx = this.ctx; const W = this.canvas.width, H = this.canvas.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.save();
    ctx.scale(1 / dpr, 1 / dpr); // convert back to CSS px for crisp UI strokes
    const wCss = W / dpr, hCss = H / dpr;
    const cx = wCss * 0.5, cy = hCss * 0.5;
    const base = Math.min(wCss, hCss);

    ctx.lineCap = "round"; ctx.strokeStyle = "white";
    const rings = [0.12, 0.18, 0.24];
    rings.forEach((rr, i) => {
      ctx.beginPath(); ctx.globalAlpha = i === 0 ? 0.95 : 0.85; ctx.lineWidth = i === 0 ? 1.8 : 1.4;
      ctx.arc(cx, cy, rr * base, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.restore();
  }
}

// Helpers
function clamp01(x:number){ return x < 0 ? 0 : (x > 1 ? 1 : x); }
function mix(a:number,b:number,t:number){ return a * (1 - t) + b * t; }
function triMix(A:[number,number,number], B:[number,number,number], C:[number,number,number], t:number):[number,number,number]{
  const tt = clamp01(t * 2);
  if (tt <= 1) return [ mix(A[0],B[0],tt), mix(A[1],B[1],tt), mix(A[2],B[2],tt) ];
  const u = tt - 1; return [ mix(B[0],C[0],u), mix(B[1],C[1],u), mix(B[2],C[2],u) ];
}
function phaseWeight(p:BreathPhase){
  switch(p){
    case "inhale": return 1.0;
    case "hold-in": return 0.95;
    case "exhale": return 0.45;
    case "hold-out": return 0.35;
  }
}
function phaseMorph(p:BreathPhase){ // fallback crown mix when rho is absent
  switch(p){
    case "inhale": return 0.15;
    case "hold-in": return 0.45; // crown hush near crest
    case "exhale": return 0.10;
    case "hold-out": return 0.05;
  }
}

// Define once
if (!customElements.get("field-bands-bg")) {
  customElements.define("field-bands-bg", FieldBandsBGEl);
}
