// src/modulation/ModMatrix.ts
type Source = 'breath01'|'breathSS'|'velocity'|'tCycle';
export interface Binding { source:Source; scale?:number; bias?:number; srcMin?:number; srcMax?:number; smooth?:number; apply:(v:number)=>void; }

export class ModMatrix {
  private bindings: Binding[] = [];
  add(b: Binding){ this.bindings.push(b); }
  apply(state: {breath01:number;breathSS:number;velocity:number;tCycle:number}) {
    for (const b of this.bindings) {
      const raw = state[b.source];
      const clamped = clamp(raw, b.srcMin ?? -Infinity, b.srcMax ?? Infinity);
      const v = (b.bias ?? 0) + (b.scale ?? 1) * clamped;
      b.apply(v);
    }
  }
}
const clamp = (x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
