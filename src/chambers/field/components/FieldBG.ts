// Breath-synced neutral background with horizontal bands (2D canvas).
// Keeps the existing <sae-field-bg> tag and applyBreath(b) API.
// Future: add mode="gl" path & parallax/crown morph.

import type { BreathPhase } from "@/types/Core";
import { breathPalette, type BreathLite } from "@/color/BreathPalette";
import { FIELD_NEUTRAL } from "@/color/profiles";

type LocalBreath = { phase: BreathPhase; value: number; bpm: number; tGlobal: number; };

function clamp(x: number, min = 0, max = 1) { return x < min ? min : x > max ? max : x; }
function smooth01(x: number) { const t = clamp(x); return t * t * (3 - 2 * t); } // smoothstep(0,1,x)

export class FieldBGEl extends HTMLElement {
  static get observedAttributes() { return ["bands", "thickness", "softness", "speed", "hue-sway", "mode", "basis"]; }

  private shadow!: ShadowRoot;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private ro?: ResizeObserver;

  // params (tweakable via attributes)
  private bands = 7;          // count
  private thickness = 0.75;   // relative to band spacing
  private softness = 0.35;   // feather relative to thickness
  private speed = 1.0;    // overall speed scalar
  private hueSwayDeg = 4;     // small ± hue sway with breath
  private mode: "2d" | "gl" = "2d";
  private basis = "neutral";  // reserved for future profiles

  // state
  private dpr = Math.max(1, (globalThis.devicePixelRatio || 1));
  private raf: number | undefined;
  private lastT = 0;

  // peristaltic / breath-lite
  private offsetPx = 0;         // scroll offset in pixels (bands move through)
  private breath01 = 0.5;       // in-phase 0..1
  private breathSS = 0;         // signed -1..+1 (exhale..inhale)
  private velocity = 0;         // estimated d/dt of signed breath
  private vSignedPrev = 0;      // for velocity calc
  private tPrev = 0;

  // smoothing (1-pole)
  private ssFilt = 0;           // smoothed breathSS
  private velFilt = 0;          // smoothed velocity
  private readonly ssAlpha = 0.10;
  private readonly velAlpha = 0.12;

  private signedCont = 0;  // continuous signed breath in [-1..+1]


  constructor() { super(); this.shadow = this.attachShadow({ mode: "open" }); }

  connectedCallback() {
    this.shadow.innerHTML = `
      <style>
        :host { position:absolute; inset:0; display:block; }
        canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
      </style>
      <canvas></canvas>
    `;
    this.canvas = this.shadow.querySelector("canvas") as HTMLCanvasElement;
    const ctx = this.canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;

    // initial size
    this.resizeToCSS();

    // observe size changes
    this.ro = new ResizeObserver(() => this.resizeToCSS());
    this.ro.observe(this);

    // listen for chamber broadcast as a fallback (engine also calls applyBreath)
    this.addEventListener("field-breath" as any, (e: any) => this.applyBreath(e.detail));

    // start loop
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.onFrame);
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = undefined;
  }

  attributeChangedCallback(n: string, _o: string | null, v: string | null) {
    if (v == null) return;
    if (n === "bands") this.bands = Math.max(1, Math.floor(Number(v) || this.bands));
    else if (n === "thickness") this.thickness = clamp(Number(v) || this.thickness, 0.1, 1.5);
    else if (n === "softness") this.softness = clamp(Number(v) || this.softness, 0.05, 1.5);
    else if (n === "speed") this.speed = clamp(Number(v) || this.speed, 0.1, 4);
    else if (n === "hue-sway") this.hueSwayDeg = clamp(Number(v) || this.hueSwayDeg, 0, 30);
    else if (n === "mode") this.mode = (v === "gl" ? "gl" : "2d");
    else if (n === "basis") this.basis = v;
  }

  // API used by FieldChamber
  applyBreath(b: LocalBreath) {
    // map to in-phase 0..1
    const v01 = b.value;                         // 0..1 in-phase
    const vSignedPhase =
      b.phase === "inhale" ? +v01 :
        b.phase === "exhale" ? -v01 :
          this.signedCont * 0.94;                   // <-- decay gently toward 0 during pause

    // low-jitter easing of the phase-mapped value itself (optional but nice)
    const vSignedEased = Math.sign(vSignedPhase) * smooth01(Math.abs(vSignedPhase));

    // velocity from continuous signal
    const dt = this.tPrev ? Math.max(1e-3, (b.tGlobal - this.tPrev)) : 0;
    const vel = dt ? (vSignedEased - this.signedCont) / dt : 0;

    this.signedCont = vSignedEased;
    this.breath01 = v01;
    this.breathSS = vSignedEased;
    this.velocity = vel;

    this.tPrev = b.tGlobal;
  }

  // ---- rendering loop ----
  private onFrame = (t: number) => {
    const dt = Math.min(0.06, (t - this.lastT) / 1000); // clamp dt for stability
    this.lastT = t;

    // smooth inputs
    this.ssFilt += (this.breathSS - this.ssFilt) * this.ssAlpha;
    this.velFilt += (this.velocity - this.velFilt) * this.velAlpha;

    // advance peristaltic offset (px/s scaled by canvas height)
    const h = this.canvas.height || 1;
    const baseSpeed = 0.02 * h; // ~20px/s at 1080p
    const dir = Math.abs(this.ssFilt) < 0.02 ? 0 : Math.sign(this.ssFilt);
    const phaseGain = 0.7 + 0.6 * clamp(this.breath01); // fuller/faster on inhale
    this.offsetPx += (baseSpeed * this.speed * dir * phaseGain) * dt;

    // draw
    this.draw();

    this.raf = requestAnimationFrame(this.onFrame);
  };

  private resizeToCSS() {
    const rect = this.getBoundingClientRect();
    const dpr = Math.max(1, (globalThis.devicePixelRatio || 1));
    this.dpr = dpr;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private draw() {
    const g = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    if (!w || !h) return;

    // palette from breath (neutral anchors)
    // PATCH: reduce hue sway near pause so color doesn't "tick" at the crest
    const swayScale = 0.5 + 0.5 * Math.abs(this.ssFilt); // 50% at pause → 100% at crest
    const pal = breathPalette(
      FIELD_NEUTRAL,
      { breath01: this.breath01, breathSS: this.ssFilt, velocity: this.velFilt } as BreathLite,
      { hueSwayDeg: this.hueSwayDeg * swayScale }
    );

    // --- background wash (vertical gradient) ---
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, `rgb(${pal.gl.srgb.skyTop.map(x => Math.round(x * 255)).join(",")})`);
    bg.addColorStop(1, `rgb(${pal.gl.srgb.skyBot.map(x => Math.round(x * 255)).join(",")})`);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // --- horizontal bands ---
    const bandRGB = pal.gl.srgb.band; // [r,g,b] sRGB 0..1
    const bandColor = `rgb(${bandRGB.map(x => Math.round(x * 255)).join(",")})`;

    const n = Math.max(1, this.bands | 0);
    const spacing = h / n;
    const baseHalf = (this.thickness * spacing) * 0.5;          // core half-thickness
    const feather = (this.softness * baseHalf);                // edge feather
    const alphaBase = 0.18;
    const alphaBoost = clamp(Math.abs(this.velFilt) * 0.5, 0, 0.25);
    const alpha = alphaBase + alphaBoost;

    // scroll offset wrapped to spacing
    let off = this.offsetPx % spacing;
    if (off < 0) off += spacing;

    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < n + 2; i++) {
      const centerY = (i * spacing) + off; // band center in pixels

      // vertical gradient for band feather
      const y0 = Math.max(0, centerY - baseHalf - feather);
      const y1 = Math.min(h, centerY + baseHalf + feather);
      if (y1 <= 0 || y0 >= h) continue;

      const grad = g.createLinearGradient(0, y0, 0, y1);
      // transparent → edge → core → edge → transparent
      grad.addColorStop(0.00, `rgba(0,0,0,0)`);
      grad.addColorStop(feather / (baseHalf + feather), `${bandColor}`);
      grad.addColorStop(0.5, `${bandColor}`);
      grad.addColorStop(1 - feather / (baseHalf + feather), `${bandColor}`);
      grad.addColorStop(1.00, `rgba(0,0,0,0)`);

      g.globalAlpha = alpha;
      g.fillStyle = grad;
      g.fillRect(0, y0, w, (y1 - y0));
    }

    // optional: very faint top/bottom vignettes can be added later if needed
  }
}

if (!customElements.get("sae-field-bg")) {
  customElements.define("sae-field-bg", FieldBGEl);
}
declare global { interface HTMLElementTagNameMap { "sae-field-bg": FieldBGEl; } }
