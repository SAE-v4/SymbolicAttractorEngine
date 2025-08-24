// src/chambers/solarSpiralGate/SolarSpiralGateChamber.ts
import type { ChamberDef } from "@/types/ChamberDefs";
import { drawGateRings } from "@/renderers/gateRings";
//import { drawSpiralRiver } from "@/renderers/spiralRenderer";
import { drawSpiralRibbon } from "@/renderers/spiralRibbon";
import type { Vec2 } from "@/types/Core";
import { WitnessVisual } from "@/systems/witnessVisual";
import { GateFlash } from "@/systems/gate";
import { drawSolarCoreGlow } from "@/renderers/solarCoreGlow";
import { PAL } from "@/config/palette";

function punchAnnulusArc(
  g: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number,               // center radius (≈ ring radius)
  thick: number,           // thickness of the band to remove
  center: number,          // center angle (rad)
  span: number             // angular span (rad)
){
  const rOuter = r + thick * 0.5;
  const rInner = r - thick * 0.5;

  g.save();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(cx, cy, rOuter, center - span/2, center + span/2, false);
  g.arc(cx, cy, rInner, center + span/2, center - span/2, true); // reverse to make a ring
  g.closePath();
  g.fill();
  g.restore();
}

function strokeArc(
  g: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number, lw: number,
  center: number, span: number,
  style: string, blend: GlobalCompositeOperation = "source-over",
  shadow?: { color:string; blur:number }
){
  g.save();
  g.globalCompositeOperation = blend;
  g.strokeStyle = style;
  g.lineCap = "round";
  g.lineWidth = lw;
  if (shadow){ g.shadowColor = shadow.color; g.shadowBlur = shadow.blur; }
  g.beginPath();
  g.arc(cx, cy, r, center - span/2, center + span/2, false);
  g.stroke();
  g.restore();
}



export type GateGeom = { cx: number; cy: number; r: number };
export type BreathClock = {
  breathPhase: () => number;
  breath01?: () => number;
};

export const DEFAULT_SOLAR_SPIRAL_DEF: ChamberDef = {
  id: "solar-spiral-gate",
  systems: {
    breath: {
      shape: 0.9,
      offset: 0.0,
      beatWidth: 0.08,
      band: { alphaBase: 0.22, alphaGain: 0.35, alphaBeat: 0.14 },
      gate: { ringGain: 0.6 },
    },
    palette: {
      solarCore: "#FFEFC2",
      ring: "#B9D7FF",
      spiral: "#A9C9FF",
      horizon: "#90B6FF",
      spark: "#CFE3FF",
      bg: "#07162A",
    },
  },
  spiral: {
    turns: 1.15,
    length: 1.0,
    baseWidth: 10,
    peristalsis: { freq: 2.0, amp: 0.6, phase: 0.0 },
    glow: { core: 1.0, halo: 3.0 },
  },
  witness: {
    aura: { rBase: 18, rGain: 18, aBase: 0.12, aGain: 0.18 },
    flash: { gain: 0.6, decay: 2.8 },
  },
};

function norm(v:Vec2){ const m=Math.hypot(v.x,v.y)||1; return {x:v.x/m,y:v.y/m}; }


export class SolarSpiralGateChamber {
  private g: CanvasRenderingContext2D;
  private def: ChamberDef;
  private witness: WitnessVisual;
  private gateFlash: GateFlash;

  private clock?: BreathClock;
  private alignment = 0; // 0..1
  private getFacing?: () => Vec2;
  private phase = 0;
  private prevPhase = 0;
  private bpm = 30;
  private coreBeatBoost = 0; // 0..1

  private sampleTangent(rGate:number){
  const s = this.def.spiral!;
  const a = rGate * 0.75;                 // same r0 you pass to ribbon
  const turns = s.turns, len = s.length;
  const thetaMax = turns * Math.PI*2 * len;
  const t = 0.62;                          // sample position (tweak 0.58..0.66)
  const th = t * thetaMax;
  const r = a + (a*0.65)/(turns*Math.PI*2) * th;  // r = a + bθ, b≈(a*0.65)/(turns*2π)
  const b = (a*0.65)/(turns*Math.PI*2);
  const dx = b*Math.cos(th) - r*Math.sin(th);
  const dy = b*Math.sin(th) + r*Math.cos(th);
  const m = Math.hypot(dx,dy)||1;
  return { x: dx/m, y: dy/m };
}

private computeAlignment(facing:Vec2, rGate:number){
  const tHat = this.sampleTangent(rGate);
  const fHat = norm(facing);
  const dot = tHat.x*fHat.x + tHat.y*fHat.y;     // [-1..1]
  this.alignment = Math.max(0, Math.min(1, 0.5*(1+dot)));
}

  constructor(
    g: CanvasRenderingContext2D,
    private getGate: () => GateGeom,
    def?: ChamberDef,
    clock?: BreathClock,
    getFacing?: () => Vec2
  ) {
    this.g = g;
    this.def = def ?? DEFAULT_SOLAR_SPIRAL_DEF;
    this.clock = clock;
    this.getFacing = getFacing;
    this.witness = new WitnessVisual(this.def);
    this.gateFlash = new GateFlash(this.def);
  }

  private tick(dt: number) {
    this.prevPhase = this.phase;
    this.phase = this.clock
      ? this.clock.breathPhase() % 1
      : (this.phase + (this.bpm / 60) * dt) % 1;

    const w = this.def.systems?.breath?.beatWidth ?? 0.08;
    if (this.prevPhase > 1 - w && this.phase < w) {
      this.witness.onBeat();
      this.gateFlash.onBeat();
      this.coreBeatBoost = Math.min(1, this.coreBeatBoost + 0.7); // pop the core
    }
    this.witness.tick(dt);
    this.gateFlash.tick(dt);
    this.coreBeatBoost = Math.max(0, this.coreBeatBoost - 2.5 * dt);
  }

  private render() {
    const g = this.g;
    const { cx, cy, r } = this.getGate();

  const facing = this.getFacing ? this.getFacing() : {x:0,y:-1};
  this.computeAlignment(facing, r);
    // NOTE: no bg fill here—the SkyGL layer should remain visible beneath.

    // Horizon (soft line slightly below ring center)
    g.save();
    g.globalAlpha = 0.18;
    g.strokeStyle = "rgba(141,177,255,0.6)"; // uses compositing; palette already similar
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, cy + r * 1.05);
    g.lineTo(g.canvas.width, cy + r * 1.05);
    g.stroke();
    g.restore();

    // Rings + core
    drawGateRings(g, this.def, cx, cy, r, this.phase, false, this.inhale01());
    drawSolarCoreGlow(
      g,
      this.def,
      cx,
      cy,
      r,
      this.inhale01(),
      this.coreBeatBoost
    );
    this.gateFlash.draw(g, cx, cy, r);

 console.log(facing)
  drawSpiralRibbon(
    g, this.def,
    cx, cy + r*1.05, r*0.75,
    this.phase, this.inhale01(),
    facing
  );

  // --- Occlusion & contact rim (after ribbon, before ring restrokes) ---
if ((window as any).__occOn ?? true) {
  // center the mask at TOP (−π/2), let breathe a little
  const inhale = this.inhale01();
  const span   = (window as any).__occSpan ?? (Math.PI * (0.46 + 0.06*inhale));  // ~83°..86°
  const offset = (window as any).__occOffset ?? 0;                                // radians
  const thick  = (window as any).__occThick ?? (12 + 8*inhale);                   // px
  const center = -Math.PI/2 + offset;

  // 1) punch a narrow ring segment under the top lip
  punchAnnulusArc(g, cx, cy, r*0.95, thick, center, span);

  // 2) soft under-rim shadow for depth
  strokeArc(
    g, cx, cy, r*0.93, 8,
    center, span * 0.86,
    "rgba(10,20,40,0.25)", "multiply",
    { color: "rgba(0,0,0,0.35)", blur: 12 }
  );

  // 3) contact rim highlight to “seal” the edge
  strokeArc(
    g, cx, cy, r*0.95, 6,
    center, span,
    PAL(this.def).css("ring", 0.35), "lighter"
  );
}


    // Witness seed below spiral
    this.witness.draw(g, cx, cy + r * 1.95, this.phase);
  }

  private inhale01(): number {
    if (this.clock?.breath01)
      return Math.max(0, Math.min(1, this.clock.breath01()));
    return Math.sin(this.phase * Math.PI * 2) * 0.5 + 0.5;
  }

  // what mount.ts expects
  update(dt: number) {
    this.tick(dt);
    this.render();
  }
}
