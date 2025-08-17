// src/vis/phaseFX.ts
export type PhaseFXOpts = {
  baseA?: number;        // base alpha for overlays
  breathDepth?: number;  // 0..1 how much the phase modulates
  rippleDecay?: number;  // seconds for beat ripples to fade
};

export class PhaseFX {
  private t = 0;
  private ripple = 0; // decays after onBeat()

  constructor(private getPhase: () => number, private opts: PhaseFXOpts = {}) {}

  update(dt: number) {
    this.t += dt;
    if (this.ripple > 0) this.ripple = Math.max(0, this.ripple - dt / (this.opts.rippleDecay ?? 0.6));
  }

  onBeat() {
    this.ripple = 1; // trigger a brief flash/ripple
  }

  // 0..1 breathing value from musical phase (smooth)
  breath(): number {
    const p = this.getPhase();              // 0..1
    const s = Math.sin(p * Math.PI * 2);    // -1..1
    return 0.5 + 0.5 * s;                   // 0..1
  }

  // global overlay alpha combining base + breath + ripple
  overlayAlpha(mult = 1): number {
    const base = this.opts.baseA ?? 0.06;
    const depth = this.opts.breathDepth ?? 0.5;         // how much breath affects alpha
    const a = base + depth * this.breath() + 0.35 * this.ripple;
    return Math.min(1, a * mult);
  }
}

// @render/phaseFX.ts
export function drawPhaseFX(
  g: CanvasRenderingContext2D,
  phase: number,
  w: number,
  h: number
) {
  const breath = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2); // 0..1

  g.save();
  g.globalCompositeOperation = "source-over";

  // 1) subtle breathing background
  const bg = g.createLinearGradient(0, 0, 0, h);
  const base = 235; // blue-ish white
  const lift = Math.floor(10 * breath);
  bg.addColorStop(0, `rgb(${base},${base + 3 + lift},${base + 8 + lift})`);
  bg.addColorStop(1, `rgb(${base - 3},${base + lift},${base + 5 + lift})`);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  // 2) horizontal luminous bands
  const bandGap = Math.max(60, h * 0.12);
  const bandThickness = Math.max(6, h * 0.012);
  g.globalCompositeOperation = "lighter";  // isolate with save/restore
  g.globalAlpha = 0.25 + 0.25 * breath;

  for (let y = (h * 0.25) % bandGap; y < h; y += bandGap) {
    const grd = g.createLinearGradient(0, y - bandThickness, 0, y + bandThickness);
    grd.addColorStop(0, "rgba(160,190,255,0)");
    grd.addColorStop(0.5, "rgba(200,220,255,1)");
    grd.addColorStop(1, "rgba(160,190,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, y - bandThickness, w, bandThickness * 2);
  }

  g.restore(); // important — prevents 'lighter' leaking to later draws
}
