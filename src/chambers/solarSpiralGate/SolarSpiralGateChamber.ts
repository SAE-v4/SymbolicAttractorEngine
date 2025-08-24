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

function clamp01(x:number){ return x < 0 ? 0 : x > 1 ? 1 : x; }

function ribbonConstants(r0:number, turns:number){
  const TWO_PI = Math.PI*2;
  const a = r0;
  const b = (r0 * 0.65) / (turns * TWO_PI); // same spacing as ribbon
  const thetaMax = turns * TWO_PI;         // s.length assumed 1.0
  return { a, b, thetaMax };
}

// Approximate the ribbon contact point near the “top” (−π/2)
// We scan a tiny window of t and pick the point closest to that angle.
function findRibbonContact(cx:number, cy:number, r0:number, def: ChamberDef){
  const s = def.spiral!;
  const { a, b, thetaMax } = ribbonConstants(r0, s.turns);
  let best = { ang: -Math.PI/2, dist: 1e9, x:cx, y:cy };

  const steps = 80;
  const tMin = 0.56, tMax = 0.66;          // small window around the lip
  for (let i=0;i<=steps;i++){
    const t  = tMin + (tMax - tMin) * (i/steps);
    const th = t * thetaMax;
    const r  = a + b * th;
    const x  = cx + r*Math.cos(th);
    const y  = cy + r*Math.sin(th);

    const ang = Math.atan2(y - cy, x - cx);
    const d   = Math.abs(ang - (-Math.PI/2));
    if (d < best.dist) best = { ang, dist:d, x, y };
  }
  return best; // { ang, x, y }
}

function punchAnnulusArcEvenOdd(
  g:CanvasRenderingContext2D,
  cx:number, cy:number,
  rCenter:number, thick:number,
  angle:number, span:number
){
  const half = Math.max(0, thick) * 0.5;
  const r0 = Math.max(0, rCenter - half);
  const r1 = Math.max(r0, rCenter + half);

  const a0 = angle - span*0.5;
  const a1 = angle + span*0.5;

  g.save();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  // outer slice (ccw)
  g.arc(cx, cy, r1, a0, a1, false);
  // inner slice (reverse to make even-odd)
  g.arc(cx, cy, r0, a1, a0, true);
  g.closePath();
  g.fill();
  g.restore();
}

function strokeArc(
  g:CanvasRenderingContext2D,
  cx:number, cy:number, r:number, lw:number,
  angle:number, span:number,
  color:string, op:"source-over"|"lighter"|"multiply"="source-over",
  shadow?: { color:string, blur:number }
){
  const a0 = angle - span*0.5;
  const a1 = angle + span*0.5;

  g.save();
  g.globalCompositeOperation = op;
  g.strokeStyle = color;
  g.lineCap = "round";
  g.lineWidth = lw;
  if (shadow){ g.shadowColor = shadow.color; g.shadowBlur = shadow.blur; }
  g.beginPath();
  g.arc(cx, cy, Math.max(0, r), a0, a1, false);
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

  const facing = this.getFacing ? this.getFacing() : { x: 0, y: -1 };
  this.computeAlignment(facing, r);

  // 1) Horizon
  g.save();
  g.globalAlpha = 0.18;
  g.strokeStyle = "rgba(141,177,255,0.6)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, cy + r * 1.05);
  g.lineTo(g.canvas.width, cy + r * 1.05);
  g.stroke();
  g.restore();

// --- Rings + core (draw first) ---
drawGateRings(g, this.def, cx, cy, r, this.phase, false, this.inhale01());
drawSolarCoreGlow(g, this.def, cx, cy, r, this.inhale01(), this.coreBeatBoost);
this.gateFlash.draw(g, cx, cy, r);

// --- Occlusion tied to actual ribbon contact ---
{
  const r0 = r * 0.75;                         // your ribbon's start radius
  const C  = findRibbonContact(cx, cy, r0, this.def);
  const center = C.ang;                        // contact angle

  // Match the ring stack radius: starts a little inside the big ring.
  // You can tweak live: window.__occRO = 0.60..0.68
  const occRO   = (window as any).__occRO ?? 0.64;
  const rOcc    = r * occRO;

  // Span / thickness breathe a touch with inhale
  const inh     = this.inhale01();
  const span    = (window as any).__occSpan  ?? (Math.PI * (0.78 + 0.04*inh));
  const thick   = (window as any).__occThick ?? (12 + 6*inh);
  const offset  = (window as any).__occOffset ?? 0.0;

// --- flip to bottom if our sampled contact is on the top half
let A = C.ang + offset;
if (C.y < cy) A += Math.PI;               // move to the opposite side (bottom)
A = Math.atan2(Math.sin(A), Math.cos(A)); // wrap to [-π, π]
  // 1) Punch a thin annulus wedge to actually hide rings/core under lip
  punchAnnulusArcEvenOdd(g, cx, cy, rOcc, thick, A, span);

  // 2) Soft under-rim shadow that lines up with ring tones
  strokeArc(
    g, cx, cy, rOcc - 2, 8,
    A, span * 0.86,
    "rgba(8, 16, 32, 0.28)", "multiply",
    { color: "rgba(0,0,0,0.35)", blur: 12 }
  );

  // 3) Contact rim highlight (sits above everything except ribbon shine)
  strokeArc(
    g, cx, cy, rOcc, 5,
    A, span,
    PAL(this.def).css("ring", 0.38), "lighter"
  );
}

// --- Ribbon (now above the occluded rings/core) ---
drawSpiralRibbon(
  g, this.def,
  cx, cy + r*1.05, r*0.75,
  this.phase, this.inhale01(),
  facing
);


// 4) witness
this.witness.draw(g, cx, cy + r*1.95, this.phase);

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
