// src/systems/color/Palette.ts
import type { BreathSample } from "@/types/Core";
import type { Lens } from "@/types/Lens";
import type { CssColor } from "@/types/";
import { breathPalette } from "./breathPalette";
import type { Oklch } from  "@/types/"
import { cssOKLCH } from "./oklch";
import {
  FIELD_NEUTRAL, DAWN_SEPT, LUNAR_INDIGO,
  POOL_AMBER, POOL_SLATE
} from "./profiles";

// Lens → default anchors (Pool-tuned)
const lensAnchors: Record<Lens, typeof FIELD_NEUTRAL> = {
  observatory: DAWN_SEPT,    // calm cool daylight
  garden:      FIELD_NEUTRAL,
  witness:     POOL_AMBER,   // warm, lyrical witness pool
  organ:       POOL_SLATE,   // cool slate, quiet & metabolic
};

function toLite(breath: BreathSample){
  const breath01 = (breath.value + 1) * 0.5;
  const breathSS = breath.phase === "pause" ? 0 : (breath.phase === "inhale" ? +1 : -1);
  return { breath01, breathSS, velocity: 0 };
}

// small OKLCH nudge helpers
function nudge(o: Oklch, dL=0, dC=0, dH=0): Oklch {
  return { l: Math.max(0, Math.min(1, o.l + dL)), c: Math.max(0, o.c + dC), h: (o.h + dH + 360) % 360 };
}

export const Palette = {
  // existing simple surfaces
  bandFill(breath: BreathSample, lens: Lens, _macroHue: number): CssColor {
    const css = breathPalette(lensAnchors[lens], toLite(breath)).css;
    return css.ribbon; // background wash
  },

  bandStripe(breath: BreathSample, lens: Lens, _macroHue: number): CssColor {
    const css = breathPalette(lensAnchors[lens], toLite(breath)).css;
    return css.knot;   // stripe accent
  },

  // — New: split shadow/light for two-channel bands —
  bandChannels(breath: BreathSample, lens: Lens, _macroHue: number): { shadow: CssColor; light: CssColor } {
    const p = breathPalette(lensAnchors[lens], toLite(breath));
    // Start from ribbon as mid-tone; derive channels with subtle L/C shifts
    // Light lifts a touch; Shadow lowers & desaturates a touch.
    // Pause reduces contrast naturally because breathPalette narrows deltas.
    const ribbon = p.gl ? null : null; // ignore GL path here; we only need CSS
    // We reconstruct OKLCH from css? Better to re-derive from anchors:
    // grab the current "ribbon" OKLCH by recomputing via anchors blend:
    // We can't access raw OKLCH from breathPalette.css; so approximate:
    // use knot as 'light' base, ribbon as mid; make shadow slightly darker.
    const cssBaseLight = p.css.traveler; // brightest of the css set
    const cssBaseMid   = p.css.ribbon;

    // quick and practical: parse lightness from the string isn't robust; instead
    // fudge via separate CSS choices:
    const light  = cssBaseLight;
    const shadow = p.css.knot; // slightly darker than traveler/ribbon in your setup

    return { shadow, light };
  },

  echoStroke(kind: "trace-spiral"|"trace-zigzag"|"tap-hold", lens: Lens, _macroHue:number): CssColor {
    const css = breathPalette(lensAnchors[lens], { breath01:0.5, breathSS:0, velocity:0 }).css;
    if (kind === "trace-spiral") return css.traveler;
    if (kind === "trace-zigzag") return css.ribbon;
    return css.knot;
  }
};
