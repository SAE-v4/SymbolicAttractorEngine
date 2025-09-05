import { cssOKLCH, mix, mixHue, oklchToLinearSRGB, linearToSRGB3, type OKLCH } from './oklch';
import type { PaletteAnchors } from './profiles';

export type BreathLite = { breath01: number; breathSS: number; velocity: number };

function lerpOKLCH(a: OKLCH, b: OKLCH, t: number, hueSwayDeg = 0) {
  const h = mixHue(a.h, b.h, t) + hueSwayDeg;
  return { l: mix(a.l, b.l, t), c: mix(a.c, b.c, t), h };
}

export function breathPalette(anchors: PaletteAnchors, breath: BreathLite, opts?: {
  biasExp?: number; hueSwayDeg?: number;  // hue sway driven by breathSS
}) {
  const bias = opts?.biasExp ?? 0.75;
  const t = Math.pow(Math.min(1, Math.max(0, breath.breath01)), bias);
  const sway = (opts?.hueSwayDeg ?? 4) * breath.breathSS; // small ± sway

  const skyTop = lerpOKLCH(anchors.skyTopA, anchors.skyTopB, t, sway);
  const skyBot = lerpOKLCH(anchors.skyBotA, anchors.skyBotB, t, sway);

  // Derive accents if not provided: slightly brighter, higher chroma than skyTop
  const ribbon = anchors.ribbonA && anchors.ribbonB
    ? lerpOKLCH(anchors.ribbonA, anchors.ribbonB, t, sway)
    : { l: Math.min(1, skyTop.l + 0.10), c: Math.min(0.25, skyTop.c + 0.020), h: skyTop.h };

  const aura = anchors.auraA && anchors.auraB
    ? lerpOKLCH(anchors.auraA, anchors.auraB, t, sway)
    : { l: Math.min(1, skyTop.l + 0.06), c: skyTop.c, h: skyTop.h };

  const ring = anchors.ringA && anchors.ringB
    ? lerpOKLCH(anchors.ringA, anchors.ringB, t, sway)
    : { l: Math.min(1, skyTop.l + 0.14), c: Math.min(0.28, skyTop.c + 0.03), h: skyTop.h };

  // Outputs
  const glLinear = {
    skyTop: oklchToLinearSRGB(skyTop),
    skyBot: oklchToLinearSRGB(skyBot),
    band:   oklchToLinearSRGB(ribbon), // use ribbon tone for bands
    halo:   oklchToLinearSRGB(aura),
    ring:   oklchToLinearSRGB(ring),
  };

  const glSRGB = {
    skyTop: linearToSRGB3(glLinear.skyTop),
    skyBot: linearToSRGB3(glLinear.skyBot),
    band:   linearToSRGB3(glLinear.band),
    halo:   linearToSRGB3(glLinear.halo),
    ring:   linearToSRGB3(glLinear.ring),
  };

  const css = {
    ribbon: cssOKLCH(ribbon),
    knot:   cssOKLCH({ ...ribbon, l: Math.min(1, ribbon.l + 0.05) }),
    traveler: cssOKLCH({ ...ribbon, l: Math.min(1, ribbon.l + 0.10), c: Math.min(0.35, ribbon.c + 0.02) }),
  };

  return { gl: { linear: glLinear, srgb: glSRGB }, css };
}
