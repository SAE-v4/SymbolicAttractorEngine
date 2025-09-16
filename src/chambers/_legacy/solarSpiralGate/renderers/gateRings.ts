// renderers/gateRings.ts
import { PAL } from "@/chambers/_legacy/solarSpiralGate/config/palette";
import type { ChamberDef } from "@types/ChamberDef";

// renderers/gateRings.ts
export function drawGateRings(
  g, def, cx, cy, r, phase, beat, inhale = 0
){
  const b = def.systems?.breath!;
  const p = Math.sin((phase + b.offset) * Math.PI * 2) * 0.5 + 0.5;
  const shaped = Math.pow(p, b.shape);
  const amp = 0.5*shaped + 0.5*inhale; // blend phase-shape with inhale

  const alphaBase = b.band.alphaBase + b.band.alphaGain*amp + (beat ? b.band.alphaBeat : 0);
  const ringGain  = def.systems?.breath?.gate?.ringGain ?? 0.5;

  for (let i=0;i<4;i++){
    const rr = r*(0.65 + 0.12*i + 0.06*amp*ringGain);
    const thick = 3 + 6*(1 - i/4) + 3*amp;
    g.strokeStyle = PAL(def).css("ring", alphaBase*(0.9 - i*0.12));
    g.lineWidth = thick;
    g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI*2); g.stroke();
  }
}

