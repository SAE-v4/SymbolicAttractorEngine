// A lightweight musical clock: 1 bar = 4 beats (4/4) by default.
// Emits beat events via onBeat() subscriptions and exposes bar phase [0..1).

import { crossed } from "../utils/phaseUtils";

type BeatKind = "downbeat" | "quarter" | "eighth";
type Listener = (t: number) => void;

export class TempoEngine {
  private bpm = 90;
  private beatsPerBar = 4;     // 4/4 for now
  private barPhase = 0;        // 0..1
  private runningTime = 0;     // seconds since start (engine time)
  private listeners: Record<BeatKind, Set<Listener>> = {
    downbeat: new Set(), quarter: new Set(), eighth: new Set(),
  };

  // cache thresholds for subdivisions (in bar phase)
  private quarters = [0, 0.25, 0.5, 0.75];
  private eighths  = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

  setBpm(bpm: number) {
    this.bpm = Math.max(1, bpm);
  }
  getBpm() { return this.bpm; }

  // Phase over a full bar
  phase() { return this.barPhase; }

  // Call every update(dt)
  tick(dt: number) {
    this.runningTime += dt;
    const barDur = (this.beatsPerBar * 60) / this.bpm; // seconds per bar
    const prev = this.barPhase;
    this.barPhase = (this.barPhase + dt / barDur) % 1;

    // emit beat events at crossings
    // downbeat
    if (crossed([0], prev, this.barPhase) !== null) this.emit("downbeat");
    // quarter
    if (crossed(this.quarters, prev, this.barPhase) !== null) this.emit("quarter");
    // eighth
    if (crossed(this.eighths, prev, this.barPhase) !== null) this.emit("eighth");
  }

  onBeat(kind: BeatKind, fn: Listener) {
    this.listeners[kind].add(fn);
    return () => this.listeners[kind].delete(fn);
  }

  private emit(kind: BeatKind) {
    const t = this.runningTime;
    for (const fn of this.listeners[kind]) fn(t);
  }
}
