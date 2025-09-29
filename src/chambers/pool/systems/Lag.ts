// src/chambers/pool/systems/Lag.ts
export class Lag {
  private y = 0;
  constructor(private tauSec = 0.15, init = 0) { this.y = init; }
  /** Update towards target with time-constant tauSec; returns smoothed value */
  step(target: number, dt: number) {
    const k = Math.exp(-Math.max(0, dt) / Math.max(1e-3, this.tauSec));
    this.y = k * this.y + (1 - k) * target;
    return this.y;
  }
  value() { return this.y; }
  reset(v: number) { this.y = v; }
}
