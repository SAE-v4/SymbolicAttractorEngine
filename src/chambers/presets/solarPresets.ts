// breath + visual param presets for the chamber

import type { SpiralConfig, RingClockConfig, TravelerConfig, WitnessConfig, VisualsConfig } from '@chambers/solarSpiralGate/spiral/types';

export const spiralCfg: SpiralConfig = {
  type: 'archimedean', a: 0.28, k: 0.095, turns: 1.4,
  knots: { count: 12, spacing: 'even-theta' },
  breathe: { scaleEpsilon: 0.08, widthGain: 0.35, peristalsis: { amp: 0.0, speed: 1.0 } },
};

export const ringClock: RingClockConfig = { rBase: 0.50, rGain: 0.20, hitEpsilon: 0.006 };

export const travelerCfg: TravelerConfig = { startIndex: 0, ease: 'outCubic', moveDur: 0.6, leanGain: 0.04 };

export const witnessCfg: WitnessConfig = { pos: [0, -0.45], scaleBase: 1.0, scaleGain: 0.06, glowGain: 0.6 };

export const visuals: VisualsConfig = {
  palette: 'solar',
  bands: { driftBase: 0.10, driftGain: 0.10, dutyRange: [0.35, 0.65] },
  ring: { sharpenFromVelocity: 1.5 },
  bloom: { peakPop: { amount: 0.35, decayMs: 450 } }
};
