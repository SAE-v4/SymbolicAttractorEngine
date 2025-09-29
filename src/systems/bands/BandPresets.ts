import type { BandsUniforms, BandsLens } from "./BandTypes";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const DEFAULT_BANDS: PartialBy<BandsUniforms, "lens"|"phase"> = {
  value: 0.5,
  velocity: 0,
  bpm: 6.0,

  bandFreq: 5.8,
  bandTilt: -0.02,
  bandSoft: 0.28,
  driftBase: 0.10,
  driftGain: 0.18,
  bandAlpha: 0.50,

  gradeTop: 0.12,
  gradeBot: 0.28,
  gamma: 1.18,
  vignette: 0.12,
};

export const PRESETS: Record<BandsLens, Partial<BandsUniforms>> = {
  observatory: {
    bandFreq: 5.7, bandTilt: -0.03, bandSoft: 0.26,
    driftBase: 0.10, driftGain: 0.18, bandAlpha: 0.48,
    gradeTop: 0.10, gradeBot: 0.28, gamma: 1.20, vignette: 0.12,
  },
  witness: {
    bandFreq: 5.8, bandTilt: -0.01, bandSoft: 0.34,
    driftBase: 0.04, driftGain: 0.08, bandAlpha: 0.42,
    gradeTop: 0.12, gradeBot: 0.22, gamma: 1.15, vignette: 0.16,
    phaseBandY: 0.50, phaseBandWidth: 0.06, phaseBandSoft: 0.04,
    phaseBandAlpha: 0.25, phaseBandValue: 0.85,
  },
  metabolic: {
    bandFreq: 5.1, bandTilt: +0.02, bandSoft: 0.24,
    driftBase: 0.20, driftGain: 0.24, bandAlpha: 0.60,
    gradeTop: 0.14, gradeBot: 0.30, gamma: 1.10, vignette: 0.10,
  },
  garden: {
    bandFreq: 5.9, bandTilt: +0.08, bandSoft: 0.28,
    driftBase: 0.10, driftGain: 0.14, bandAlpha: 0.50,
    gradeTop: 0.12, gradeBot: 0.26, gamma: 1.20, vignette: 0.10,
    iFreqDelta: 0.18, iTiltDelta: -0.12, iAlpha: 0.45,
  },
};

export function resolveBands(lens: BandsLens, overrides?: Partial<BandsUniforms>): BandsUniforms {
  return {
    lens,
    phase: 1,
    ...DEFAULT_BANDS,
    ...PRESETS[lens],
    ...(overrides || {}),
  } as BandsUniforms;
}
