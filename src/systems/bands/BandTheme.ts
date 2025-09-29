// src/systems/bands/BandTheme.ts
import type { BandTheme, BandInputs, Oklch } from "./BandTypes";
import { cssOKLCH, lerpOKLCH } from "./BandColor";

// --- TEST: unmistakable lanes for tuning ---
const TEST_LIGHT: Oklch  = { l: 0.88, c: 0.12,  h: 100 }; // yellow
const TEST_SHADOW: Oklch = { l: 0.30, c: 0.14,  h: 300 }; // purple
const TEST_FILL: Oklch   = { l: 0.78, c: 0.015, h: 120 }; // neutral warm grey

export const THEME_TEST: BandTheme = {
  key: "test",
  fill: () => cssOKLCH(TEST_FILL),
  channels: () => ({
    light:  cssOKLCH(TEST_LIGHT),
    shadow: cssOKLCH(TEST_SHADOW),
    fill:   cssOKLCH(TEST_FILL),
  }),
};

// --- NORMAL: gentle card/pool look (tweak to taste) ---
const N_LIGHT_A: Oklch  = { l: 0.62, c: 0.040, h: 240 };
const N_LIGHT_B: Oklch  = { l: 0.72, c: 0.060, h: 228 };
const N_SHADOW_A: Oklch = { l: 0.40, c: 0.030, h: 238 };
const N_SHADOW_B: Oklch = { l: 0.48, c: 0.040, h: 232 };
const N_FILL_A: Oklch   = { l: 0.50, c: 0.030, h: 236 };
const N_FILL_B: Oklch   = { l: 0.58, c: 0.040, h: 240 };

export const THEME_NORMAL: BandTheme = {
  key: "normal",
  fill: ({ breath }) => {
    const t = (breath.value + 1) * 0.5;
    return cssOKLCH(lerpOKLCH(N_FILL_A, N_FILL_B, t));
  },
  channels: ({ breath }) => {
    const t = (breath.value + 1) * 0.5;
    return {
      light:  cssOKLCH(lerpOKLCH(N_LIGHT_A,  N_LIGHT_B,  t)),
      shadow: cssOKLCH(lerpOKLCH(N_SHADOW_A, N_SHADOW_B, t)),
      fill:   cssOKLCH(lerpOKLCH(N_FILL_A,   N_FILL_B,  t)),
    };
  },
};

// --- VIBRANT: teal→yellow (light), teal→purple (shadow) ---
const V_TEAL:   Oklch = { l: 0.62, c: 0.090, h: 190 };
const V_YELLOW: Oklch = { l: 0.88, c: 0.125, h: 100 };
const V_PURPLE: Oklch = { l: 0.30, c: 0.140, h: 300 };
const V_FILL:   Oklch = { l: 0.78, c: 0.015, h: 120 };

export const THEME_VIBRANT: BandTheme = {
  key: "vibrant",
  fill: () => cssOKLCH(V_FILL),
  channels: ({ breath }) => {
    const t = (breath.value + 1) * 0.5; // 0..1
    const light  = lerpOKLCH(V_TEAL,   V_YELLOW, t);
    const shadow = lerpOKLCH(V_TEAL,   V_PURPLE, 1 - t);
    return { light: cssOKLCH(light), shadow: cssOKLCH(shadow), fill: cssOKLCH(V_FILL) };
  },
};

export const THEMES = {
  normal: THEME_NORMAL,
  test:   THEME_TEST,
  vibrant: THEME_VIBRANT,
} as const;

export type ThemeKey = keyof typeof THEMES;
export function resolveTheme(key: ThemeKey): BandTheme { return THEMES[key]; }
