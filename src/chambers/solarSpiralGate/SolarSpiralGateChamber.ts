import type { ChamberSystem, ChamberCtx } from "@engine/ChamberSystem"
import type { BreathState } from "@systems/breath/BreathRuntime"
import type { SpiralConfig, RingClockConfig, TravelerConfig } from "./spiral/types";

import { createGateAuraSystem } from "./systems/GateAuraSystem";
import { createSpiralSceneSystem } from "./systems/SpiralSceneSystem";
import { SceneCanvas } from "./spiral/SceneCanvas";

export class SolarSpiralGateChamber {
  private systems: ChamberSystem[];

  constructor(
    private g: CanvasRenderingContext2D,
    private getBreath: () => BreathState,
    private getCycle: () => number,
    private getGate: () => { cx: number; cy: number; r: number },
    painter: SceneCanvas,
    spiralCfg: SpiralConfig,
    ringCfg: RingClockConfig,
    travelerCfg: TravelerConfig
  ) {
this.systems = [
  createGateAuraSystem(), 
  createSpiralSceneSystem(painter, spiralCfg, ringCfg, travelerCfg),
].sort((a,b)=>a.z-b.z);
  }

  update(dt: number) {
    const breath = this.getBreath();
    const tCycle = this.getCycle();
    const { cx, cy, r } = this.getGate();
    const ctx: ChamberCtx = { g: this.g, cx, cy, rGate: r, tCycle, breath };

    for (const s of this.systems) s.tick(dt, ctx);
    // clear scene once per frame (in CSS px; main.ts already does this)
    for (const s of this.systems) s.render(ctx);
  }
}
