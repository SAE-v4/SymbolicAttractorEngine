import { mixOKLCH, oklchStr, hasOKLCH } from "@utils/oklch";
import { PALETTE } from "@config/palette";

export function ribbonColor(breath01:number){ // slight bias to warmth near inhale peak
  const t = Math.pow(breath01, 0.75);
  const o = mixOKLCH(PALETTE.dawnSteel.ribbon, PALETTE.septemberBlue.ribbon, t);
  return hasOKLCH ? oklchStr(o) : "rgba(240,248,255,0.9)"; // fallback
}
export function auraBase(breath01:number){
  const t = Math.pow(breath01, 0.75);
  const o = mixOKLCH(PALETTE.dawnSteel.aura, PALETTE.septemberBlue.aura, t);
  return hasOKLCH ? oklchStr({...o, a:1}) : "rgba(210,225,255,1)";
}
