import type { LensKey, ShaderProfile } from "./BandTypes";

// Tight ranges from SolarSpiralGate doc (kept conservative). :contentReference[oaicite:0]{index=0}
export const LENSES: Record<LensKey, ShaderProfile> = {
  observatory: {
    id: "observatory",
    uniforms: {
      u_bandFreq: 5.4,
      u_tilt: 0.015,               // tiny rightward tilt
      u_soften: 0.82,
      u_alphaBase: 0.14,
      u_alphaGain: 0.22,
      u_driftBase: 0.10,
      u_driftGain: 0.20,
      u_yGamma: 1.28,
      u_gradeLift: 0.035,
      u_gradeSat: 1.14,
      u_vignette: 0.18,
      u_witnessCurve: 0.00,        // off by default
      u_phaseBoost: 0.00,
      u_tintLCSh: [0,0,0]
    }
  },
  witness: {
    id: "witness",
    uniforms: {
      u_bandFreq: 5.0,
      u_tilt: 0.000,
      u_soften: 0.85,
      u_alphaBase: 0.16,
      u_alphaGain: 0.18,
      u_driftBase: 0.07,
      u_driftGain: 0.14,
      u_yGamma: 1.30,
      u_gradeLift: 0.040,
      u_gradeSat: 1.10,
      u_vignette: 0.22,
      u_witnessCurve: 0.22,        // gentle curvature channel
      u_phaseBoost: 0.10,
      u_tintLCSh: [0,0,0]
    }
  },
  metabolic: {
    id: "metabolic",
    uniforms: {
      u_bandFreq: 6.0,
      u_tilt: 0.025,
      u_soften: 0.80,
      u_alphaBase: 0.12,
      u_alphaGain: 0.26,
      u_driftBase: 0.12,
      u_driftGain: 0.25,
      u_yGamma: 1.22,
      u_gradeLift: 0.030,
      u_gradeSat: 1.20,
      u_vignette: 0.14,
      u_witnessCurve: 0.00,
      u_phaseBoost: 0.00,
      u_tintLCSh: [0,0,0]
    }
  },
  garden: {
    id: "garden",
    uniforms: {
      u_bandFreq: 4.8,
      u_tilt: 0.018,
      u_soften: 0.84,
      u_alphaBase: 0.13,
      u_alphaGain: 0.20,
      u_driftBase: 0.09,
      u_driftGain: 0.18,
      u_yGamma: 1.24,
      u_gradeLift: 0.032,
      u_gradeSat: 1.16,
      u_vignette: 0.16,
      u_witnessCurve: 0.00,
      u_phaseBoost: 0.00,
      u_tintLCSh: [0,0,0]
    }
  }
};
