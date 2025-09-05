import type { DayPhase, SymbolicUIVocab, GestaltDef } from "@/symbolic-ui/vocab/types";

export class Observatory {
  constructor(private vocab: SymbolicUIVocab) {}

  resolve(dayPhase: DayPhase) {
    const g = this.vocab.gestalts ?? [];
    const active = g.filter(x => !x.when.phase || x.when.phase === dayPhase);
    const effects = active.reduce((acc, it) => ({
      auraGain:    it.effects.auraGain    ?? acc.auraGain,
      ringPulse:  (acc.ringPulse ?? 0) +  (it.effects.ringPulse ?? 0),
      ribbonWeight: it.effects.ribbonWeight ?? acc.ribbonWeight,
      shaderFlags: [...(acc.shaderFlags ?? []), ...(it.effects.shaderFlags ?? [])]
    }), {} as GestaltDef["effects"]);
    return { active, effects };
  }
}
