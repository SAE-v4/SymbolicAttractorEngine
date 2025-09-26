import type { BreathPhase } from "@/types";
export class PhaseGlimmer {
  private last: BreathPhase = "exhale";
  private t = 0; private active = false;
  update(current: BreathPhase){ if (current !== this.last){ this.active = true; this.t = 1; this.last = current; } }
  advance(dt:number){ if(!this.active) return 0; this.t = Math.max(0, this.t - dt*3.2); if(this.t===0) this.active=false; return this.t; }
}
