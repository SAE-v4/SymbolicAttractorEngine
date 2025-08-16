// utils/Flags.ts
export type FlagsShape = {
  assistLevel: number;        // 0..1
  softWall: boolean;          // use contain vs wrap
  accel: number;              // px/s^2 (pre-scale)
  maxSpeed: number;           // px/s   (pre-scale)
  noInputDamp: number;        // extra damping/sec when not steering
  edgePull: number;           // inward pull base
  edgeDamp: number;           // extra damping at edge
  gateDir: 1 | -1;            // CCW or CW
  openThreshold: number;      // 0..1
  openSeconds: number;        // time to fill
  decayPerSec: number;        // progress decay
  breathTolerance: number;    // 0..1
};

const defaults: FlagsShape = {
  assistLevel: 0.4,
  softWall: true,
  accel: 1000,
  maxSpeed: 520,
  noInputDamp: 1.6,
  edgePull: 160,
  edgeDamp: 0.18,
  gateDir: 1,
  openThreshold: 0.68,
  openSeconds: 1.9,
  decayPerSec: 0.16,
  breathTolerance: 0.22,
};

export class Flags {
  private v: FlagsShape;
  constructor() {
    this.v = { ...defaults };
    this.applyLocal();
    this.applyQuery();
    (window as any).Flags = this; // dev console access
  }
  get all() { return this.v; }
  set(partial: Partial<FlagsShape>) {
    this.v = { ...this.v, ...partial };
    localStorage.setItem("sae.flags", JSON.stringify(this.v));
  }
  reset() {
    localStorage.removeItem("sae.flags");
    this.v = { ...defaults };
  }
  private applyLocal() {
    try {
      const raw = localStorage.getItem("sae.flags");
      if (raw) this.v = { ...this.v, ...JSON.parse(raw) };
    } catch { /* ignore */ }
  }
  private applyQuery() {
    const u = new URL(location.href);
    u.searchParams.forEach((val, key) => {
      if (!(key in this.v)) return;
      const cur = (this.v as any)[key];
      let parsed: any = val;
      if (typeof cur === "number") parsed = Number(val);
      if (typeof cur === "boolean") parsed = val === "1" || val === "true";
      if (key === "gateDir") parsed = val === "-1" ? -1 : 1;
      (this.v as any)[key] = parsed;
    });
  }
}
