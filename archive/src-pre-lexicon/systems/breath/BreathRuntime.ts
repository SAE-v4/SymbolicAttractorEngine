// --- BreathRuntime ----------------------------------------------------------
export type BreathPhase = 'inhale'|'holdIn'|'exhale'|'holdOut';

export interface BreathState {
  breath01: number;    // [0..1]
  breathSS: number;    // [-1..1]
  velocity: number;    // d(breath01)/dt
  phase: BreathPhase;
  tCycle: number;      // [0..1)
}

export interface BreathConfig {
  mode: 'freeRun'|'tempoLocked'|'entrainToMotion';
  rateBPM?: number;                 // default 9
  depth?: number;                   // future use
  phaseOffset?: number;             // [0..1], default 0
  shape: {
    inhaleRatio: number;
    holdIn:     number;
    exhaleRatio:number;
    holdOut:    number;
    curveInhale: 'easeInOutSine'|'easeInOutCubic'|'linear';
    curveExhale: 'easeInOutSine'|'easeInOutCubic'|'linear';
  };
  variability?: { enabled:boolean; jitterPct:number; seed?:number };
}

export class BreathRuntime {
  state: BreathState = { breath01:0, breathSS:-1, velocity:0, phase:'inhale', tCycle:0 };

  private cfg: BreathConfig;
  private cycleT = 0;          // seconds into cycle
  private cycleDur = 0;        // seconds per cycle
  private baseBPM = 9;
  private rng = mulberry32(137);   // deterministic jitter
  private nextJitter = 1.0;        // multiplier applied to cycleDur per-cycle only

  constructor(cfg: BreathConfig) {
    this.cfg = cfg;
    this.baseBPM = cfg.rateBPM ?? 9;
    this.recomputeDur(this.baseBPM);
    // seed RNG
    if (cfg.variability?.seed !== undefined) this.rng = mulberry32(cfg.variability.seed);
    this.scheduleNextJitter(); // prepare first cycle's jitter
  }

  setConfig(partial: Partial<BreathConfig>) {
    this.cfg = { ...this.cfg, ...partial };
    if (partial.rateBPM !== undefined) this.baseBPM = partial.rateBPM;
    if (partial.variability?.seed !== undefined) this.rng = mulberry32(partial.variability.seed);
    this.recomputeDur(this.baseBPM);
  }

  tick(dt: number, ctx?: { engineBPM?: number; motionCadenceBPM?: number }) {
    const safeDt = Math.max(1e-6, dt);

    // choose effective BPM
    let effBPM = this.baseBPM;
    if (this.cfg.mode === 'tempoLocked' && ctx?.engineBPM) effBPM = ctx.engineBPM;
    else if (this.cfg.mode === 'entrainToMotion' && ctx?.motionCadenceBPM) {
      // gentle slide toward motion cadence
      effBPM = lerp(effBPM, ctx.motionCadenceBPM, 0.2 * safeDt);
    }

    // duration based on effective BPM, with per-cycle jitter multiplier
    const baseDur = 60 / Math.max(0.0001, effBPM);
    // if we just wrapped (or on first tick), lock in the jitter for this cycle
    let wrapped = false;
    if ((this.cycleT + safeDt) >= this.cycleDur) {
      wrapped = true;
      // compute new jitter for the next cycle
      this.scheduleNextJitter();
    }
    // apply current cycle's duration
    this.cycleDur = baseDur * this.nextJitter;

    // advance time (modulo)
    const prev = this.state.breath01;
    this.cycleT = (this.cycleT + safeDt) % this.cycleDur;

    // normalized cycle (with optional phase offset)
    const tCycleRaw = this.cycleT / this.cycleDur;
    const tCycle = frac(tCycleRaw + (this.cfg.phaseOffset ?? 0));

    // sample envelope
    const { breath01, phase } = shapeSample(tCycle, this.cfg.shape);
    const velocity = (breath01 - prev) / safeDt;

    this.state = {
      breath01,
      breathSS: breath01 * 2 - 1,
      velocity,
      phase,
      tCycle,
    };
  }

  private recomputeDur(bpm: number) {
    this.cycleDur = 60 / Math.max(0.0001, bpm);
  }

  private scheduleNextJitter() {
    const v = this.cfg.variability;
    if (v?.enabled) {
      const j = Math.max(0, v.jitterPct ?? 0);
      // multiplier in [1-j, 1+j]
      this.nextJitter = 1 + (this.rng() * 2 - 1) * j;
    } else {
      this.nextJitter = 1.0;
    }
  }
}

// --- helpers ---------------------------------------------------------------
const lerp = (a:number,b:number,t:number)=>a+(b-a)*Math.max(0,Math.min(1,t));
const frac = (x:number)=>x - Math.floor(x);

// tiny seeded RNG for determinism
function mulberry32(seed:number){
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  }
}

// easing
function easeInOutSine(x:number){ return 0.5 - 0.5 * Math.cos(Math.PI * 2.0 * (x*0.5)); } // smooth 0..1
function easeInOutCubic(x:number){
  return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;
}

// segment sampler with holds + asymmetric curves
function shapeSample(
  t: number,
  shape: BreathConfig['shape']
): {breath01:number; phase:BreathPhase} {
  const i = Math.max(0, shape.inhaleRatio);
  const hi = Math.max(0, shape.holdIn);
  const e = Math.max(0, shape.exhaleRatio);
  const ho = Math.max(0, shape.holdOut);
  const sum = i + hi + e + ho || 1;
  const ni = i/sum, nhi = hi/sum, ne = e/sum, nho = ho/sum;

  const t0 = ni;          // end inhale
  const t1 = ni + nhi;    // end holdIn
  const t2 = ni + nhi + ne; // end exhale
  // holdOut ends at 1

  if (t < t0) {
    // inhale 0 -> 1
    const u = t / ni;
    const f = shape.curveInhale === 'easeInOutCubic' ? easeInOutCubic(u)
            : shape.curveInhale === 'linear'         ? u
            : /*easeInOutSine*/                        (0.5 - 0.5*Math.cos(Math.PI*u));
    return { breath01: f, phase: 'inhale' };
  }
  if (t < t1) {
    return { breath01: 1, phase: 'holdIn' };
  }
  if (t < t2) {
    // exhale 1 -> 0
    const u = (t - t1) / ne;
    const f = shape.curveExhale === 'easeInOutCubic' ? easeInOutCubic(u)
            : shape.curveExhale === 'linear'         ? u
            : /*easeInOutSine*/                        (0.5 - 0.5*Math.cos(Math.PI*u));
    return { breath01: 1 - f, phase: 'exhale' };
  }
  return { breath01: 0, phase: 'holdOut' };
}
