// Minimal shared types for Bands

export type BreathPhase = "inhale" | "pause" | "exhale";
export type DayPhase = "dawn" | "day" | "dusk" | "night";

export type LensKey = "observatory" | "witness" | "metabolic" | "garden";

export interface BandInputs {
  breath: { phase: BreathPhase; value: number; velocity: number; bpm: number; tGlobal: number; };
  day: { tDay01: number; phase: DayPhase }; // slow drift / tinting
  lens: LensKey;
}

export interface BandChannels {
  // fast, per-breath accents
  tiltAcc: number;        // ± small radians
  alphaAcc: number;       // ± 0..1
  gradeAcc: number;       // ± contrast lift
  witnessAcc: number;     // 0..1 curvature + phase-band boost on Pause

  // slow day tints
  tintL: number;          // luminance delta
  tintC: number;          // chroma delta
  tintH: number;          // hue degrees
}

export interface ShaderProfile {
  id: string;
  // uniform keys used by the fragment shader
  uniforms: {
    u_bandFreq: number;
    u_tilt: number;
    u_soften: number;
    u_alphaBase: number;
    u_alphaGain: number;
    u_driftBase: number;
    u_driftGain: number;
    u_yGamma: number;
    u_gradeLift: number;
    u_gradeSat: number;
    u_vignette: number;
    u_witnessCurve?: number;   // optional: pause accent curvature
    u_phaseBoost?: number;     // optional: pause bright band boost
    u_tintLCSh?: [number, number, number];
  };
}
