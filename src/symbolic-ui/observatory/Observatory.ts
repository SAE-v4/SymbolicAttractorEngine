import type { DayPhase, GestaltDef, Prox, SymbolicEffects, SymbolicUIVocab } from "../vocab/types";

export interface ObservatoryCtx {
  phase01: number;            // breath.breath01
  dayPhase: DayPhase;         // "dawn" | "day" | "dusk" | "night"
  sunProximity?: Prox;        // if you later compute from Sun glyph
  moonProximity?: Prox;
}

export class Observatory {
  constructor(private vocab: SymbolicUIVocab) {}

  resolve(ctx: ObservatoryCtx): { active: GestaltDef[]; effects: SymbolicEffects } {
    const g = this.vocab.gestalts ?? [];
    const matches = g.filter(x =>
      (x.when.phase ? x.when.phase === ctx.dayPhase : true) &&
      (x.when.sunProximity ? x.when.sunProximity === ctx.sunProximity : true) &&
      (x.when.moonProximity ? x.when.moonProximity === ctx.moonProximity : true)
    );
    // Soft fallback by dayPhase if nothing matched
    const fallback = g.find(x => x.when.phase === ctx.dayPhase) ?? null;
    const active = matches.length ? matches : (fallback ? [fallback] : []);
    const effects = active.reduce<SymbolicEffects>((acc, it) => {
      return { ...acc,
        auraGain: it.effects.auraGain ?? acc.auraGain,
        ringPulse: (acc.ringPulse ?? 0) + (it.effects.ringPulse ?? 0),
        ribbonWeight: it.effects.ribbonWeight ?? acc.ribbonWeight,
        shaderFlags: [...(acc.shaderFlags ?? []), ...(it.effects.shaderFlags ?? [])]
      };
    }, {});
    return { active, effects };
  }
}
