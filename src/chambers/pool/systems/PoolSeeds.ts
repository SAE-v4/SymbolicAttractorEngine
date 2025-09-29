import type { Lens } from "@/types"
import type { PoolKind } from "@/types";

export interface PoolSeed {
  t: number;
  kind: PoolKind;
  dir?: "cw"|"ccw";
  confidence: number;
  center: {x:number;y:number};
  dv?: Partial<[number,number,number,number,number,number,number]>; // Vec7 accent
  lens: Lens;
  day01: number;
}

export class PoolSeeds {
  constructor(private getDispatch: () => (e:Event)=>boolean) {}

  build(e:{ kind:PoolKind; dir?:"cw"|"ccw"; confidence:number; centroid:{x:number;y:number} }, lens: Lens, day01:number): PoolSeed {
    return {
      t: performance.now(),
      kind: e.kind,
      dir: e.dir,
      confidence: e.confidence,
      center: e.centroid,
      dv: this.dvFor(e),
      lens,
      day01
    };
  }

  private dvFor(e:{kind:PoolKind; dir?:"cw"|"ccw"; confidence:number}): PoolSeed["dv"] {
    const k = Math.min(0.3, 0.15 + 0.35 * e.confidence);
    if (e.kind === "trace-spiral") return [0, +0.08*k, +0.06*k, 0, 0, +0.12*k, +0.04*k];
    if (e.kind === "trace-zigzag") return [+0.10*k, 0, -0.04*k, +0.12*k, 0, -0.08*k, -0.04*k];
    // tap-hold
    return [0, 0, +0.14*k, -0.06*k, 0, +0.04*k, +0.10*k];
  }
}
