// src/systems/color/Palette.ts
import type { BreathSample } from "@/types/Core";
import type { Lens } from "@/types/Lens";
import type { CssColor } from "@/types/Color";
import { breathPalette } from "./BreathPalette";
import { cssOKLCH, type OKLCH } from "./oklch";
import {
  FIELD_NEUTRAL, DAWN_SEPT, LUNAR_INDIGO,
  POOL_AMBER, POOL_SLATE, VIBRANT_HORIZON
} from "./profiles";

export type PaletteTheme = "default" | "vibrant";
let currentTheme: PaletteTheme = "default";

const defaultAnchors: Record<Lens, any> = {
  observatory: DAWN_SEPT,
  garden:      FIELD_NEUTRAL,
  witness:     POOL_AMBER,
  organ:       POOL_SLATE,
};

function anchorsFor(lens: Lens){
  return currentTheme === "vibrant" ? VIBRANT_HORIZON : (defaultAnchors[lens] ?? FIELD_NEUTRAL);
}

function toLite(breath: BreathSample){
  const breath01 = (breath.value + 1) * 0.5;         // exhale..inhale → 0..1
  const breathSS = breath.phase === "pause" ? 0 : (breath.phase === "inhale" ? +1 : -1);
  return { breath01, breathSS, velocity: 0 };
}

// --- tiny OKLCH lerp helpers for vibrant ---
const wrap = (h:number)=>((h%360)+360)%360;
function lerp(a:number,b:number,t:number){ return a + (b-a)*t; }
function lerpHue(a:number,b:number,t:number){
  const A = wrap(a), B = wrap(b);
  const d = wrap(B - A + 180) - 180;
  return wrap(A + d*t);
}
function lerpOKLCH(a:OKLCH, b:OKLCH, t:number): OKLCH {
  return { l: lerp(a.l,b.l,t), c: lerp(a.c,b.c,t), h: lerpHue(a.h,b.h,t) };
}

// Pick three anchor hues that match your mock
const V_TEAL   : OKLCH = { l:0.62, c:0.090, h:190 };
const V_YELLOW : OKLCH = { l:0.88, c:0.125, h:100 };
const V_PURPLE : OKLCH = { l:0.28, c:0.140, h:300 };

export const Palette = {
  setTheme(theme: PaletteTheme) { currentTheme = theme; },

  bandFill(breath: BreathSample, lens: Lens, _macroHue: number): CssColor {
  if (currentTheme === "vibrant") {
    // neutral warm-grey so lanes pop
    return "oklch(78% 0.015 120)";
  }
  const css = breathPalette(anchorsFor(lens), toLite(breath)).css;
  return css.ribbon;
  },

  // kept for non-vibrant themes
  bandStripe(breath: BreathSample, lens: Lens, _macroHue: number): CssColor {
    const css = breathPalette(anchorsFor(lens), toLite(breath)).css;
    return css.knot;
  },

  // --- critical: return complementary channels in vibrant mode ---
  bandChannels(breath: BreathSample, lens: Lens, _macroHue: number): { shadow: CssColor; light: CssColor } {
    if (currentTheme === "vibrant") {
      const t = (breath.value + 1) * 0.5; // 0..1, exhale..inhale
      // light lane moves toward YELLOW on inhale; starts nearer TEAL
      const light  = lerpOKLCH(V_TEAL,   V_YELLOW, t);
      // shadow lane moves toward PURPLE on exhale; invert t or blend TEAL→PURPLE
      const shadow = lerpOKLCH(V_TEAL,   V_PURPLE, 1 - t);
      return { shadow: cssOKLCH(shadow), light: cssOKLCH(light) };
    }
    // default behavior
    const p = breathPalette(anchorsFor(lens), toLite(breath));
    return { shadow: p.css.knot, light: p.css.traveler };
  },
};
