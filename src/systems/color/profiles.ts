import type { OKLCH } from './oklch';

export type PaletteAnchors = {
  skyTopA: OKLCH; skyTopB: OKLCH;
  skyBotA: OKLCH; skyBotB: OKLCH;
  ribbonA?: OKLCH; ribbonB?: OKLCH;   // optional overrides
  auraA?: OKLCH;   auraB?: OKLCH;
  ringA?: OKLCH;   ringB?: OKLCH;
};

// — New: Pool-leaning warm amber (good for Witness) —
export const POOL_AMBER: PaletteAnchors = {
  // gentle warm shift with inhale; low chroma to keep it lyrical, not neon
  skyTopA: { l:0.58, c:0.045, h: 52 }, skyTopB: { l:0.68, c:0.070, h: 58 },
  skyBotA: { l:0.46, c:0.038, h: 48 }, skyBotB: { l:0.54, c:0.055, h: 54 },
  // optional accents (slightly brighter for band “light”)
  ribbonA: { l:0.70, c:0.065, h: 56 }, ribbonB: { l:0.78, c:0.085, h: 60 },
  auraA:   { l:0.64, c:0.050, h: 56 }, auraB:   { l:0.72, c:0.060, h: 60 },
};

// — New: Pool cool slate (good for Night/Organ or quiet Observatory) —
export const POOL_SLATE: PaletteAnchors = {
  skyTopA: { l:0.50, c:0.030, h:230 }, skyTopB: { l:0.58, c:0.045, h:238 },
  skyBotA: { l:0.42, c:0.026, h:226 }, skyBotB: { l:0.50, c:0.038, h:234 },
  ribbonA: { l:0.64, c:0.040, h:236 }, ribbonB: { l:0.70, c:0.048, h:242 },
  auraA:   { l:0.56, c:0.034, h:232 }, auraB:   { l:0.62, c:0.040, h:238 },
};

// Evening-ish Solar (Dawn↔September)
export const DAWN_SEPT: PaletteAnchors = {
  skyTopA: { l:0.52, c:0.045, h:232 }, skyTopB: { l:0.62, c:0.070, h:244 },
  skyBotA: { l:0.44, c:0.040, h:228 }, skyBotB: { l:0.50, c:0.055, h:238 },
};

// Lunar (Silver↔Indigo)
export const LUNAR_INDIGO: PaletteAnchors = {
  skyTopA: { l:0.58, c:0.022, h:235 }, skyTopB: { l:0.46, c:0.030, h:252 },
  skyBotA: { l:0.54, c:0.020, h:233 }, skyBotB: { l:0.42, c:0.028, h:250 },
};

export const FIELD_NEUTRAL: PaletteAnchors = {
  // low-chroma cool violet→blue shift, gentle lightness lift with breath
  skyTopA: { l:0.48, c:0.032, h:235 }, skyTopB: { l:0.58, c:0.050, h:242 },
  skyBotA: { l:0.42, c:0.028, h:232 }, skyBotB: { l:0.50, c:0.042, h:238 },
  // optional accents can be omitted; breathPalette will derive band/aura/ring
};
