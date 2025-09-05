export type SourceKey = 'breath01'|'breathSS'|'velocity'|'tCycle';

export interface Binding {
  source: SourceKey;
  scale?: number;   // default 1
  bias?: number;    // default 0
  srcMin?: number;  // optional clamp
  srcMax?: number;
  smooth?: number;  // 0..1 EMA smoothing
  apply: (value:number)=>void;
}

export class ModMatrix {
  private bindings: Binding[] = [];
  private smoothed = new WeakMap<Binding, number>();

  add(b: Binding){ this.bindings.push(b); }

  apply(state: Record<SourceKey, number>) {
    for (const b of this.bindings) {
      const raw = state[b.source];
      const clamped = clamp(raw, b.srcMin ?? -Infinity, b.srcMax ?? Infinity);
      let v = (b.bias ?? 0) + (b.scale ?? 1) * clamped;
      if (b.smooth !== undefined) {
        const prev = this.smoothed.get(b) ?? v;
        const k = clamp01(b.smooth);
        v = prev + (v - prev) * (1 - k);
        this.smoothed.set(b, v);
      }
      b.apply(v);
    }
  }
}

const clamp = (x:number, a:number, b:number)=>Math.max(a, Math.min(b, x));
const clamp01 = (x:number)=>Math.max(0, Math.min(1, x));
