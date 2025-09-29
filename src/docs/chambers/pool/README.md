## Pool Chamber — architecture scaffold

What this chamber expresses
Lens-driven breath projection (horizons / radial / tissue) that never stops.
User trace lands on the pool, creates witness echoes (ripples/ghosts).
A soft offering is formed: a lightweight PoolSeed (no judgement, no being).
Other chambers can subscribe to seeds and continue the story.

### Directory shape

```zsh
src/chambers/pool/
  PoolChamberEl.ts           // orchestrator web component
  layers/
    BandLayer.ts             // breath bands (lens-projected)
    EchoLayer.ts             // ripples + ghost glyphs
    TextLayer.ts             // (optional) whispers
  systems/
    PhaseGlimmer.ts          // breath-phase edge detector
    PoolSeeds.ts             // seed builder & dispatch
    Distortions.ts           // spiral/zigzag/hold refractions
  styles/                    // small CSS
  index.ts                   // define <sae-pool-chamber>
```
### Minimal contracts

Inputs
- `setBreath(breath)` from BreathRuntime (micro).
- `setClock(day01, phase)` from EngineClock (meso).
- `onTraceEnd(result)` from src/systems/gesture (your new foundation).

Output
- `CustomEvent<'pool:seed', PoolSeed>` (soft offering handoff).

```ts
export type PoolKind = "trace-spiral"|"trace-zigzag"|"tap-hold";
export interface PoolSeed {
  t: number;                       // ms or s
  kind: PoolKind;
  dir?: "cw"|"ccw";
  confidence: number;              // 0..1
  center: {x:number;y:number};     // pool-local centroid
  dv?: Partial<[number,number,number,number,number,number,number]>; // Vec7 accent
  lens: "observatory"|"garden"|"witness"|"organ";
  day01: number;                   // for later rhyme/recall
}
```
