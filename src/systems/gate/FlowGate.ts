// src/systems/gate/FlowGate.ts

export type Vec2 = { x: number; y: number };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const len = (v: Vec2) => Math.hypot(v.x, v.y);
const norm = (v: Vec2): Vec2 => {
  const L = len(v) || 1;
  return { x: v.x / L, y: v.y / L };
};
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const rot90 = (v: Vec2): Vec2 => ({ x: -v.y, y: v.x });
const rotNeg90 = (v: Vec2): Vec2 => ({ x: v.y, y: -v.x });

export type FlowGateReadout = {
  progress: number;     // 0..1
  sAlign: number;       // velocity vs tangent
  sCoherent: number;    // velocity vs accelDir
  sBreath: number;      // thrust vs target envelope
  targetThrust: number; // 0..1
  tangent: Vec2;        // tangent vector at pos
};

export class FlowGate {
  private center: Vec2;
  private phaseFn: () => number;
  private dir: 1 | -1;

  private progress = 0;
  private wasOpen = false;
  private openedPulse = false;
  private latchTimer = 0;

  // tuning defaults
  private openThreshold = 0.68;
  private openSeconds = 1.9;
  private decayPerSec = 0.16;
  private breathMid = 0.5;
  private breathDepth = 0.4;
  private breathTolerance = 0.22;
  private inwardBias = 0.2;

  public readout: FlowGateReadout = {
    progress: 0,
    sAlign: 0,
    sCoherent: 0,
    sBreath: 0,
    targetThrust: 0.5,
    tangent: { x: 1, y: 0 },
  };

  constructor(
    center: Vec2,
    phaseFn: () => number,
    dir: 1 | -1 = 1,
    friendliness = 1,
    flags?: { all: any }
  ) {
    this.center = center;
    this.phaseFn = phaseFn;
    this.dir = dir;

    const F = flags?.all;
    this.openThreshold =
      F?.openThreshold ??
      (0.75 * friendliness + 0.62 * (1 - friendliness));
    this.openSeconds =
      F?.openSeconds ??
      (2.5 * friendliness + 1.5 * (1 - friendliness));
    this.decayPerSec =
      F?.decayPerSec ??
      (0.25 * friendliness + 0.12 * (1 - friendliness));
    this.breathTolerance =
      F?.breathTolerance ??
      (0.15 * friendliness + 0.24 * (1 - friendliness));
  }

  /** force gate to stay hard-open for N seconds */
  public setLatch(seconds: number) {
    this.latchTimer = Math.max(this.latchTimer, seconds);
  }

  /** returns true only on the frame the gate first opens */
  public consumeJustOpened(): boolean {
    const v = this.openedPulse;
    this.openedPulse = false;
    return v;
  }

  // tangent with slight inward bias
  private spiralTangentAt(pos: Vec2): Vec2 {
    const radial = norm({
      x: this.center.x - pos.x,
      y: this.center.y - pos.y,
    });
    const base = this.dir === 1 ? rot90(radial) : rotNeg90(radial);
    const mixed = norm({
      x: base.x * (1 - this.inwardBias) + radial.x * this.inwardBias,
      y: base.y * (1 - this.inwardBias) + radial.y * this.inwardBias,
    });
    return mixed;
  }

  update(dt: number, pos: Vec2, vel: Vec2, accelDir: Vec2, thrust01: number) {
    const vHat = len(vel) > 0 ? norm(vel) : { x: 0, y: 0 };
    const tHat = this.spiralTangentAt(pos);

    // --- alignment score
    const align = dot(vHat, tHat); // -1..1
    const sAlign = clamp01((align - 0.6) / (1 - 0.6));

    // --- coherence score
    const aHat = norm(accelDir);
    const coh = dot(vHat, aHat);
    const sCoherent = clamp01((coh - 0.3) / (1 - 0.3));

    // --- breath score
    const phase = this.phaseFn() || 0;
    const target =
      this.breathMid + this.breathDepth * Math.sin(phase * Math.PI * 2);
    const breathErr = Math.abs(thrust01 - target);
    const sBreath = clamp01(1 - breathErr / this.breathTolerance);

    // --- combine scores
    const combined = 0.5 * sAlign + 0.3 * sBreath + 0.2 * sCoherent;

    // --- progress
    if (combined >= this.openThreshold) {
      this.progress += dt / this.openSeconds;
    } else {
      // nonlinear decay: slower if near threshold
      const near = Math.max(0, combined - (this.openThreshold - 0.15)) / 0.15;
      const decay = this.decayPerSec * (0.35 + 0.65 * (1 - near));
      this.progress -= decay * dt;
    }
    this.progress = clamp01(this.progress);

    // latch keeps gate pinned open
    if (this.latchTimer > 0) {
      this.progress = 1;
      this.latchTimer -= dt;
    }

    // edge detect
    const isOpenNow = this.progress >= 1;
    this.openedPulse = !this.wasOpen && isOpenNow;
    this.wasOpen = isOpenNow;

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
