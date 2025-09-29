// src/types/Seeds.ts
import type { Lens } from "./Lens";
import type { Vec2, Vec7 } from "./Math";

export type PoolKind = "trace-spiral" | "trace-zigzag" | "tap-hold";

export interface SeedBase {
  t: number;              // ms (performance.now()) or seconds; pick one and be consistent
  lens: Lens;             // lens at time of seeding
  day01: number;          // EngineClock position for “distant rhymes”
}

export interface PoolSeed extends SeedBase {
  kind: PoolKind;
  dir?: "cw" | "ccw";
  confidence: number;     // 0..1
  center: Vec2;           // chamber-local coordinates
  dv?: Partial<Vec7>;     // small 7D accent vector
}
