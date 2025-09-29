// src/systems/bands/BandRenderer2D.ts
import type { BandChannels } from "./BandTypes";

export function drawBandPair(g:CanvasRenderingContext2D, opts:{
  x:number; y:number; w:number;
  spacing:number; thick:number;
  lead:number; lag:number;
  softness:number; feather:number;
  colors: BandChannels; alpha:{shadow:number; light:number};
}) {
  const {x,y,w,spacing,thick,lead,lag,softness,feather,colors,alpha} = opts;

  // shadow (leading)
  g.globalAlpha = alpha.shadow;
  g.fillStyle = colors.shadow;
  g.fillRect(x, y + lead, w, thick * softness);

  // light (lagging)
  g.globalAlpha = alpha.light;
  g.fillStyle = colors.light;
  g.fillRect(x, y + lag + thick* (1 - softness/2), w, thick * softness);

  g.globalAlpha = 1;
}
