// src/chambers/solarSpiralGate/SolarSpiralGateChamber.ts
import type { ChamberDef } from "@/types/ChamberDefs";
import { drawGateRings } from "@/renderers/gateRings";
import { drawSpiralRiver } from "@/renderers/spiralRenderer";
import { drawSpiralRibbon } from "@/renderers/spiralRibbon";

import { WitnessVisual } from "@/systems/witnessVisual";
import { GateFlash } from "@/systems/gate";
import { drawSolarCoreGlow } from "@/renderers/solarCoreGlow";

export type GateGeom = { cx:number; cy:number; r:number };
export type BreathClock = { breathPhase: () => number; breath01?: () => number };

export const DEFAULT_SOLAR_SPIRAL_DEF: ChamberDef = {
  id: "solar-spiral-gate",
  systems: {
    breath: {
      shape: 0.9, offset: 0.0, beatWidth: 0.08,
      band: { alphaBase:0.22, alphaGain:0.35, alphaBeat:0.14 },
      gate: { ringGain: 0.6 },
    },
    palette: {
      solarCore:"#FFEFC2", ring:"#B9D7FF", spiral:"#A9C9FF",
      horizon:"#90B6FF", spark:"#CFE3FF", bg:"#07162A",
    }
  },
  spiral: {
    turns: 1.15, length: 1.0, baseWidth: 10,
    peristalsis: { freq: 2.0, amp: 0.6, phase: 0.0 },
    glow: { core: 1.0, halo: 3.0 }
  },
  witness: {
    aura: { rBase:18, rGain:18, aBase:0.12, aGain:0.18 },
    flash: { gain:0.6, decay: 2.8 }
  }
};

export class SolarSpiralGateChamber {
  private g: CanvasRenderingContext2D;
  private def: ChamberDef;
  private witness: WitnessVisual;
  private gateFlash: GateFlash;

private clock?: BreathClock;
private phase = 0;
private prevPhase = 0;
private bpm = 30;
private coreBeatBoost = 0; // 0..1

  constructor(
    g: CanvasRenderingContext2D,
    private getGate: () => GateGeom,
    def?: ChamberDef,
    clock?: BreathClock
  ){
    this.g = g;
    this.def = def ?? DEFAULT_SOLAR_SPIRAL_DEF;
    this.clock = clock; 
    this.witness = new WitnessVisual(this.def);
    this.gateFlash = new GateFlash(this.def);
  }

  private tick(dt:number){
    this.prevPhase = this.phase;
    this.phase = this.clock
      ? (this.clock.breathPhase() % 1)
      : (this.phase + (this.bpm/60)*dt) % 1;

    const w = this.def.systems?.breath?.beatWidth ?? 0.08;
    if (this.prevPhase > (1 - w) && this.phase < w) {
      this.witness.onBeat();
      this.gateFlash.onBeat();
      this.coreBeatBoost = Math.min(1, this.coreBeatBoost + 0.7); // pop the core
      

    }
    this.witness.tick(dt);
    this.gateFlash.tick(dt);
    this.coreBeatBoost = Math.max(0, this.coreBeatBoost - 2.5*dt);

  }

  private render(){
    const g = this.g;
    const { cx, cy, r } = this.getGate();

    // NOTE: no bg fill here—the SkyGL layer should remain visible beneath.

    // Horizon (soft line slightly below ring center)
    g.save();
    g.globalAlpha = 0.18;
    g.strokeStyle = "rgba(141,177,255,0.6)"; // uses compositing; palette already similar
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, cy + r*1.05);
    g.lineTo(g.canvas.width, cy + r*1.05);
    g.stroke();
    g.restore();

    // Rings + core
drawGateRings(g, this.def, cx, cy, r, this.phase, false, this.inhale01());
drawSolarCoreGlow(g, this.def, cx, cy, r, this.inhale01(), this.coreBeatBoost);
this.gateFlash.draw(g, cx, cy, r);


//     // Spiral river (origin just below horizon)
//     drawSpiralRiver(
//   g, this.def,
//   cx, cy + r*1.05, r*0.75,
//   this.phase,
//   this.inhale01()   // 0..1 (from BreathRuntime or derived from phase)
// );
drawSpiralRibbon(g, this.def, cx, cy + r*1.05, r*0.75, this.phase, this.inhale01());


    // Witness seed below spiral
    this.witness.draw(g, cx, cy + r*1.95, this.phase);
  }

  private inhale01(): number {
  // Prefer the BreathRuntime value if supplied
  if (this.clock?.breath01) {
    const v = this.clock.breath01();
    return Math.max(0, Math.min(1, v));
  }
  // Fallback: derive from phase (simple sinus)
  return Math.sin(this.phase * Math.PI * 2) * 0.5 + 0.5;
}
  // what mount.ts expects
  update(dt:number){
    this.tick(dt);
    this.render();
  }
}
