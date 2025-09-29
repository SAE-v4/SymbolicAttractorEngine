// src/systems/bands/BandTypes.ts
export type Lens = "observatory" | "witness" | "organ" | "garden";

export type BreathPhase = "inhale" | "pause" | "exhale";
export type BreathSample = { value: number; phase: BreathPhase; bpm: number };

export type DayPhase = "dawn" | "day" | "dusk" | "night";

export type BandInputs = {
  breath: BreathSample;
  day01: number;
  dayPhase: DayPhase;
  lens: Lens;
};

export type Oklch = { l: number; c: number; h: number }; // L∈[0..1]
export type CssColor = string;

export type BandChannels = {
  fill: CssColor;
  light: CssColor;
  shadow: CssColor;
};

export type BandThemeKey = "normal" | "test" | "vibrant";

export type BandTheme = {
  key: BandThemeKey;
  channels: (i: BandInputs) => BandChannels;
  fill?: (i: BandInputs) => CssColor;
};

export type BandsLens = "observatory" | "witness" | "metabolic" | "garden";

export interface BandsUniforms {
  lens: BandsLens;
  // breath
  phase: 0 | 1 | 2;      // inhale/pause/exhale
  value: number;         // 0..1 within phase
  velocity: number;      // signed
  bpm: number;

  // field
  bandFreq: number;
  bandTilt: number;
  bandSoft: number;
  driftBase: number;
  driftGain: number;
  bandAlpha: number;

  // grade/tone
  gradeTop: number;
  gradeBot: number;
  gamma: number;
  vignette: number;

  // witness (optional)
  phaseBandY?: number;
  phaseBandWidth?: number;
  phaseBandSoft?: number;
  phaseBandAlpha?: number;
  phaseBandValue?: number;

  // garden (optional)
  iFreqDelta?: number;
  iTiltDelta?: number;
  iAlpha?: number;
}