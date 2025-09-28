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
