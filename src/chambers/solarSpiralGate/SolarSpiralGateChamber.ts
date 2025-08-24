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



const TWO_PI = Math.PI * 2;

function punchAnnulusArc(
  g: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number,               // centre radius
  thick: number,           // radial thickness (px)
  center: number,          // angle (rad)
  span: number             // angular span (rad)
){
  const rO = r + thick * 0.5;
  const rI = r - thick * 0.5;
  g.save();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.arc(cx, cy, rO, center - span/2, center + span/2, false);
  g.arc(cx, cy, rI, center + span/2, center - span/2, true);
  g.closePath();
  g.fill();
  g.restore();
}

function strokeArc(
  g: CanvasRenderingContext2D,
  cx:number, cy:number, r:number,
  lw:number, center:number, span:number,
  style:string, blend:GlobalCompositeOperation="source-over",
  shadow?:{color:string;blur:number}
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

 console.log(facing)
  drawSpiralRibbon(
    g, this.def,
    cx, cy + r*1.05, r*0.75,
    this.phase, this.inhale01(),
    facing
  );

// --- Occlusion & contact rim (after ribbon, before ring restrokes) ---
if ((window as any).__occOn ?? true) {
  const inhale = this.inhale01();
  const s = this.def.spiral!;
  const rOcc = r * 0.95;

  // 1) find where the ribbon centreline is closest to the gate ring
  const ox = cx, oy = cy + r*1.05;           // ribbon origin
  const a  = r * 0.75;                        // r0
  const thetaMax = s.turns * TWO_PI * s.length;
  const b = (a*0.65) / (s.turns*TWO_PI);

  let bestT = 0, bestErr = 1e9, Px = 0, Py = 0;
  const STEPS = 420;
  for (let i=0;i<=STEPS;i++){
    const t  = i/STEPS;
    const th = t*thetaMax;
    const rS = a + b*th;                      // centreline (skip wobble for stability)
    const x  = ox + rS*Math.cos(th);
    const y  = oy + rS*Math.sin(th);
    const d  = Math.hypot(x-cx, y-cy);
    const err = Math.abs(d - rOcc);
    if (err < bestErr){ bestErr = err; bestT = t; Px = x; Py = y; }
  }
  const center = Math.atan2(Py - cy, Px - cx);     // angle on the gate
  // approximate ribbon width at that t (close to your renderer logic)
  const baseW = s.baseWidth * (0.90 + 0.45*inhale);
  const head  = Math.min(1, Math.max(0, (bestT-0.04)/(0.18-0.04)));
  const tail  = 1 - Math.min(1, Math.max(0, (bestT-0.78)/(0.97-0.78)));
  const taper = Math.min(head, tail);
  const wApprox = baseW * (0.25 + 0.75*taper);
  const thick = (window as any).__occThick ?? (wApprox * 1.6);   // radial band to cut
  const span  = (window as any).__occSpan  ?? (wApprox / rOcc * 2.2); // angular length

  // 2) punch the exact overlap
  punchAnnulusArc(g, cx, cy, rOcc, thick, center, span);

  // 3) soft under-rim shadow + contact rim
  strokeArc(g, cx, cy, r*0.94, 8, center, span*0.9,
            "rgba(10,20,40,0.25)", "multiply",
            { color:"rgba(0,0,0,0.35)", blur:12 });
  strokeArc(g, cx, cy, rOcc, 6, center, span,
            PAL(this.def).css("ring", 0.35), "lighter");
}

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
