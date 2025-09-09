import type { OKLCH } from './oklch';

export type PaletteAnchors = {
  skyTopA: OKLCH; skyTopB: OKLCH;
  skyBotA: OKLCH; skyBotB: OKLCH;
  ribbonA?: OKLCH; ribbonB?: OKLCH;   // optional overrides
  auraA?: OKLCH;   auraB?: OKLCH;
  ringA?: OKLCH;   ringB?: OKLCH;
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
