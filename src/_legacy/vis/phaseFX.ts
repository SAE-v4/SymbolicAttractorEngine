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
