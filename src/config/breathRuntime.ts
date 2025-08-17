// config/breathRuntime.ts
import { BREATH_TUNING } from "@config/breath";
import type { ChamberDef } from "@types/ChamberDef";

const DEFAULT_BREATH = {
  shape: 1.0,
  offset: 0.0,
  beatWidth: 0.08,
  band: { alphaBase: 0.20, alphaGain: 0.40, alphaBeat: 0.10 },
  witness: { auraRBase: 18, auraRGain: 18, auraABase: 0.12, auraAGain: 0.18 },
  gate: {} as Partial<typeof BREATH_TUNING.gate>,
};

export function applyBreathFromDef(def: ChamberDef) {
  const b = def?.systems?.breath ?? DEFAULT_BREATH;

  // core curve
  BREATH_TUNING.shape     = b.shape  ?? BREATH_TUNING.shape;
  BREATH_TUNING.offset    = b.offset ?? BREATH_TUNING.offset;
  BREATH_TUNING.beatWidth = b.beatWidth ?? BREATH_TUNING.beatWidth;

  // bands
  if (b.band) {
    BREATH_TUNING.band.alphaBase = b.band.alphaBase ?? BREATH_TUNING.band.alphaBase;
    BREATH_TUNING.band.alphaGain = b.band.alphaGain ?? BREATH_TUNING.band.alphaGain;
    // ensure alphaBeat exists in tuning
    (BREATH_TUNING.band as any).alphaBeat =
      (b.band as any).alphaBeat ?? (BREATH_TUNING.band as any).alphaBeat ?? 0.10;
  }

  // witness
  if (b.witness) {
    BREATH_TUNING.witness.auraRBase = b.witness.auraRBase ?? BREATH_TUNING.witness.auraRBase;
    BREATH_TUNING.witness.auraRGain = b.witness.auraRGain ?? BREATH_TUNING.witness.auraRGain;
    BREATH_TUNING.witness.auraABase = b.witness.auraABase ?? BREATH_TUNING.witness.auraABase;
    BREATH_TUNING.witness.auraAGain = b.witness.auraAGain ?? BREATH_TUNING.witness.auraAGain;
  }

  // optional gate strokes from breath section
  if (b.gate) {
    const g = BREATH_TUNING.gate;
    g.swellPct       = b.gate.swellPct       ?? g.swellPct;
    g.strokeBase     = b.gate.strokeBase     ?? g.strokeBase;
    g.strokeProgress = b.gate.strokeProgress ?? g.strokeProgress;
    g.strokeBreath   = b.gate.strokeBreath   ?? g.strokeBreath;
    g.strokeBloom    = b.gate.strokeBloom    ?? g.strokeBloom;
    g.ringAlphaMax   = b.gate.ringAlphaMax   ?? g.ringAlphaMax;
    g.glowAlphaMax   = b.gate.glowAlphaMax   ?? g.glowAlphaMax;
  }
}
