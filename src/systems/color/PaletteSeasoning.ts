// systems/color/PaletteSeasoning.ts
export type Axis = 0|1|2|3|4|5|6; // Light, Shadow, Warmth, Coolness, Heart, Spirit, Witness

export function seasonChannels(
  channels: { shadow: string; light: string },
  axis: Axis,
  breathPhase: "inhale"|"pause"|"exhale"
){
  // tiny OKLCH manipulations via CSS oklch() are awkward to parse;
  // pragmatic approach: apply small transparent overlays instead of re-huing strings.
  // Return optional overlay alpha/fills per channel for the renderer to apply.
  const overlay = { shadow: { alpha:0, fill:"" }, light: { alpha:0, fill:"" } };

  const A = (a:number)=>Math.max(0, Math.min(1, a));

  switch(axis){
    case 0: /* Light */   overlay.light = { alpha:A(0.10), fill:"rgba(255,255,255,0.10)" }; break;
    case 1: /* Shadow */  overlay.shadow= { alpha:A(0.10), fill:"rgba(0,0,0,0.12)" }; break;
    case 2: /* Warmth */  overlay.light = { alpha:A(0.08), fill:"oklch(70% 0.05 30)" }; break;
    case 3: /* Coolness */overlay.shadow= { alpha:A(0.08), fill:"oklch(30% 0.04 240)" }; break;
    case 4: /* Heart */   overlay.light = { alpha:A(0.08), fill:"oklch(72% 0.04 22)" }; break;
    case 5: /* Spirit */  overlay.light = { alpha:A(0.06), fill:"oklch(68% 0.05 300)" }; break;
    case 6: /* Witness */ if (breathPhase==="pause"){
                            overlay.shadow = { alpha:A(0.10), fill:"rgba(0,0,0,0.10)" };
                            overlay.light  = { alpha:A(0.10), fill:"rgba(255,255,255,0.10)" };
                          } break;
  }
  return overlay;
}
