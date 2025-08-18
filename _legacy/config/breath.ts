export type BreathTuning = {
  // curve
  shape: number;          // >1 = softer peaks, <1 = punchier
  offset: number;         // cycles (0..1), phase shift
  beatWidth: number;      // 0..0.5 — narrower = snappier downbeat
  // bands
  band: {
    alphaBase: number;    // base alpha
    alphaGain: number;    // scales with breath
    alphaBeat: number;    // extra on downbeat pulse
    thicknessBase: number;// px baseline (relative to h)
    thicknessGain: number;// ± % via breath (0.0..1.0)
    gapMinPx: number;     // min px between bands
    gapRel: number;       // fraction of h
  };
  // gate
  gate: {
    swellPct: number;     // ±% radius via breath (0.03 = 3%)
    strokeBase: number;   // px
    strokeProgress: number;
    strokeBreath: number;
    strokeBloom: number;
    ringAlphaMax: number; // clamp to avoid washout
    glowAlphaMax: number;
  };
  // witness
  witness: {
    auraRBase: number;    // px
    auraRGain: number;    // px via breath
    auraABase: number;    // alpha
    auraAGain: number;    // alpha via breath
  };
};

export const BREATH_TUNING: BreathTuning = {
  shape: 1.0,
  offset: 0.0,
  beatWidth: 0.08,

  band: {
    alphaBase: 0.15,
    alphaGain: 0.25,
    alphaBeat: 0.10,
    thicknessBase: 6,     // + h*0.012 is added in code
    thicknessGain: 0.60,
    gapMinPx: 60,
    gapRel: 0.12,
  },

  gate: {
    swellPct: 0.03,
    strokeBase: 6,
    strokeProgress: 12,
    strokeBreath: 8,
    strokeBloom: 10,
    ringAlphaMax: 0.9,
    glowAlphaMax: 0.9,
  },

witness: {
  auraRBase: 18,   // was 15
  auraRGain: 18,   // was 10 (bigger swing, more obvious breath)
  auraABase: 0.12, // was 0.05 (always visible)
  auraAGain: 0.18, // was 0.10 (stronger modulation)
}

};

export function tuneForDPR(base: BreathTuning): BreathTuning {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  if (dpr >= 3) {
    return {
      ...base,
      band: { ...base.band, alphaBase: base.band.alphaBase + 0.05, alphaGain: base.band.alphaGain + 0.05 },
      gate: { ...base.gate, ringAlphaMax: 0.85, glowAlphaMax: 0.85 },
    };
  }
  return base;
}
