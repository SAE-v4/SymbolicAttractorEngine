import { BREATH_TUNING, tuneForDPR } from "@config/breath";

function num(qs: URLSearchParams, key: string) {
  const v = qs.get(key);
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

export function applyBreathTuningFromQueryOnce() {
  // 1) device tweaks up-front
  const tuned = tuneForDPR(BREATH_TUNING);
  Object.assign(BREATH_TUNING, tuned);

  // 2) URL overrides
  const q = new URLSearchParams(location.search);

  const band   = num(q, "band");        // lifts base alpha
  const bandG  = num(q, "bandGain");    // lifts alpha gain
  const thickG = num(q, "thickGain");   // ± thickness gain
  const swell  = num(q, "swell");       // gate swell percent (e.g. 0.03 -> 3%)
  const shape  = num(q, "shape");       // breath curve shaping (>1 softer, <1 punchier)

  if (band   != null) BREATH_TUNING.band.alphaBase   += band;
  if (bandG  != null) BREATH_TUNING.band.alphaGain   += bandG;
  if (thickG != null) BREATH_TUNING.band.thicknessGain += thickG;
  if (swell  != null) BREATH_TUNING.gate.swellPct     = swell;
  if (shape  != null) BREATH_TUNING.shape             = shape;

  // (Add more knobs as you like.)
  console.log("[BreathTuning] applied", BREATH_TUNING);
}
