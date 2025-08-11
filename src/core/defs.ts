// src/chambers/core/defs.ts
export type Rule =
  | { kind:"mirror"; axis:"vertical"|"horizontal"; flipOnBeats:number[]; controlMirror:"right"; armedOnCross:true }
  | { kind:"pulse"; thresholds:number[]; onBeat:"sparkle"|"thrustWhenAligned" }
  | { kind:"gazeAlign"; target:"mirrorSelf"|"sun"; toleranceDeg:number; flashScale:number };

export type Visual =
  | { kind:"bgGradient"; dayNight:true }
  | { kind:"mirrorLine"; emphasis:"armed" | "flip" }
  | { kind:"witness"; eyeGlow:true };

export type ChamberDefinition = {
  id: string;
  title: string;
  visuals: Visual[];
  rules: Rule[];
  params?: Record<string, number|string|boolean>;
};
