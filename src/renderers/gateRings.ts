// renderers/gateRings.ts
import { PAL } from "@config/palette";
import type { ChamberDef } from "@types/ChamberDef";

export function drawGateRings(
  g:CanvasRenderingContext2D, def:ChamberDef,
  cx:number, cy:number, r:number,
  phase:number, beat:boolean
){
  const pal = PAL(def);
  const b = def.systems?.breath!;
  const rings = 4;
  const ringGain = def.systems?.breath?.gate?.ringGain ?? 0.5;

  // breathing curve (ease-in/out bias)
  const p = (Math.sin((phase + b.offset)*Math.PI*2)*0.5+0.5);
  const shaped = Math.pow(p, b.shape); // 0..1
  const alphaBase = b.band.alphaBase + b.band.alphaGain*shaped + (beat ? b.band.alphaBeat : 0);

  g.save();
  g.globalCompositeOperation = "lighter";
  for (let i=0;i<rings;i++){
    const rr = r*(0.65 + 0.12*i + 0.04*shaped*ringGain);
    const thick = 3 + 6*(1 - i/rings) + 2*shaped;
    g.strokeStyle = pal.css("ring", alphaBase*(0.9 - i*0.12));
    g.lineWidth = thick;
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI*2);
    g.stroke();
  }
  // solar core
  const core = r*0.18 + 2*shaped;
  const grad = g.createRadialGradient(cx,cy,0,cx,cy, core*3);
  grad.addColorStop(0, pal.css("solarCore", 0.95));
  grad.addColorStop(1, pal.css("solarCore", 0));
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx,cy,core*3,0,Math.PI*2); g.fill();
  g.restore();
}
