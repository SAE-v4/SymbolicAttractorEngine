// chambers/flow/FlowGate.ts
export type Vec2 = { x: number; y: number };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const len = (v: Vec2) => Math.hypot(v.x, v.y);
const norm = (v: Vec2): Vec2 => {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
};
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const rot90 = (v: Vec2): Vec2 => ({ x: -v.y, y: v.x });

export type FlowGateReadout = {
  progress: number; // 0..1
  sAlign: number; // 0..1 (vel vs spiral tangent)
  sCoherent: number; // 0..1 (vel vs accelDir)
  sBreath: number; // 0..1 (thrust vs target envelope)
  targetThrust: number; // 0..1
  tangent: Vec2; // spiral tangent at pos (unit)
};

export class FlowGate {
  private center: Vec2;
  private phaseFn: () => number;
  private progress = 0;
  private dir: 1 | -1;

  // tuning
  private openThreshold = 0.65; // combined score threshold
  private openSeconds = 1.8; // sustain time to open
  private decayPerSec = 0.15; // progress loss when below threshold
  private inwardBias = 0.2; // blend inward to keep spiral “tight”
  private breathDepth = 0.4; // target thrust swing
  private breathMid = 0.5; // target thrust midpoint
  private breathTolerance = 0.22; // ± tolerance for sBreath=1

  public readout: FlowGateReadout = {
    progress: 0,
    sAlign: 0,
    sCoherent: 0,
    sBreath: 0,
    targetThrust: 0.5,
    tangent: { x: 1, y: 0 },
  };

constructor(center: Vec2, phaseFn: () => number, dir: 1 | -1 = 1, friendliness = 1) {
  this.center = center;
  this.phaseFn = phaseFn;
  this.dir = dir;

  // ease tuning with friendliness (<1 = easier)
  this.openThreshold   = 0.75 * friendliness + 0.62 * (1 - friendliness);
  this.openSeconds     = 2.5  * friendliness + 1.5  * (1 - friendliness);
  this.decayPerSec     = 0.25 * friendliness + 0.12 * (1 - friendliness);
  this.breathTolerance = 0.15 * friendliness + 0.24 * (1 - friendliness);

  this.inwardBias      = 0.20 * friendliness + 0.28 * (1 - friendliness)
  }

  // Simple spiral field: tangent = rot90(radial-to-center), with slight inward bias
  private spiralTangentAt(pos: Vec2): Vec2 {
    // helper for -90° (clockwise) rotation
    const rotNeg90 = (v: Vec2): Vec2 => ({ x: v.y, y: -v.x });
    const radial = norm({ x: this.center.x - pos.x, y: this.center.y - pos.y });
    const base = this.dir === 1 ? rot90(radial) : rotNeg90(radial); // CCW or CW
    // slight inward bias keeps the spiral “held”
    const mixed = norm({
      x: base.x * (1 - this.inwardBias) + radial.x * this.inwardBias,
      y: base.y * (1 - this.inwardBias) + radial.y * this.inwardBias,
    });
    return mixed;
  }

  update(dt: number, pos: Vec2, vel: Vec2, accelDir: Vec2, thrust01: number) {
    const vHat = len(vel) > 0 ? norm(vel) : { x: 0, y: 0 };
    const tHat = this.spiralTangentAt(pos);
    const align = dot(vHat, tHat); // -1..1
    const sAlign = clamp01((align - 0.6) / (1 - 0.6)); // >0.6 → ramps to 1

    const aHat = norm(accelDir);
    const coh = dot(vHat, aHat);
    const sCoherent = clamp01((coh - 0.3) / (1 - 0.3)); // reward “push with your motion”

    const phase = this.phaseFn() || 0; // 0..1
    const target =
      this.breathMid + this.breathDepth * Math.sin(phase * Math.PI * 2);
    const breathErr = Math.abs(thrust01 - target);
    const sBreath = clamp01(1 - breathErr / this.breathTolerance);

    // combine scores (weights)
    const combined = 0.5 * sAlign + 0.3 * sBreath + 0.2 * sCoherent;

    if (combined >= this.openThreshold) {
      this.progress += dt / this.openSeconds;
    } else {
      this.progress -= this.decayPerSec * dt;
    }
    this.progress = clamp01(this.progress);

    this.readout = {
      progress: this.progress,
      sAlign,
      sCoherent,
      sBreath,
      targetThrust: target,
      tangent: tHat,
    };
  }

  isOpen() {
    return this.progress >= 1;
  }
}
