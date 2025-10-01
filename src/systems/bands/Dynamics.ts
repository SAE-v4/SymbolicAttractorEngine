// Breath → motion. Pure math, no WebGL.
export type Phase = "inhale" | "pause" | "exhale";
export type BreathSample = { value: number; phase: Phase; bpm: number };

export type DynamicsState = {
  speed: number;     // heights / sec
  scroll: number;    // accumulated, wrapped
  pInt: number;      // 0..1 internal progress (inhale/exhale)
  phaseTime: number; // s into current phase
  phaseDur: number;  // s per inhale/exhale (hint)
};

export type DynamicsParams = {
  // Visibility / response knobs
  K?: number;        // heights/sec at full envelope (tempo-independent)
  tau?: number;      // response time (s) to target speed
  tauPause?: number; // braking time (s) in pause
  bandFreq: number;  // needed only to wrap scroll to one period
};

export class Dynamics {
  private s: DynamicsState = { speed: 0, scroll: 0, pInt: 0, phaseTime: 0, phaseDur: 0 };
  private prevPhase: Phase = "pause";

  constructor(private p: DynamicsParams) { }

  setBreath(b: BreathSample) {
    if (b.phase !== this.prevPhase) {
      // phase edge
      this.s.phaseTime = 0;
      this.s.speed = 0;
      this.prevPhase = b.phase;
    }
  }

  update(dt: number, b: BreathSample) {
    const phase = b.phase;

    // advance internal clock only while flowing
    if (phase === "inhale" || phase === "exhale") this.s.phaseTime += dt;

    // duration hint per phase; safe default if bpm noisy
    const bpm = Math.max(1e-3, b.bpm || 6);
    const phaseDur = 30 / bpm;        // ≈ half-cycle seconds
    this.s.phaseDur = phaseDur;

    // monotonic internal 0..1 progress
    const pInt = (phase === "inhale" || phase === "exhale")
      ? Math.min(1, this.s.phaseTime / phaseDur)
      : 0.5;
    this.s.pInt = pInt;

    // envelope with non-zero slope at edges (no stall)
    const envelope = phase === "pause" ? 0 : Math.sin(Math.PI * pInt);

    // direction: inhale up (-), exhale down (+)
    const dir = phase === "inhale" ? -1 : (phase === "exhale" ? +1 : 0);

    // target speed (tempo-independent for stability; add * (bpm/60) later if desired)
    const K = this.p.K ?? 0.65;
    const target = dir * K * envelope;

    // ease toward target
    const tau = this.p.tau ?? 0.22;
    const a = 1 - Math.exp(-dt / tau);
    this.s.speed += (target - this.s.speed) * a;

    // gentle brake in pause
    if (phase === "pause") {
      const tp = this.p.tauPause ?? 0.10;
      const ap = 1 - Math.exp(-dt / tp);
      this.s.speed += (0 - this.s.speed) * ap;
    }

    // integrate & wrap
    this.s.scroll += this.s.speed * dt;
    const period = 1 / this.p.bandFreq;
    this.s.scroll = ((this.s.scroll % period) + period) % period;

    return this.s;
  }

setBandFreq(freq: number) {
  (this as any).p.bandFreq = Math.max(1e-6, freq);
}

  get() { return this.s; }
}
