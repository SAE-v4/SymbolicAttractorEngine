# BeingAura — Card Chamber

📍 Location: `src/docs/chambers/card/BeingAura.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

**BeingAura** is the **chest locus** and responsive glow of the chamber being.  
It receives offered glyphs from the FocusVessel, composes their vectors in **7D** with the being’s vector, and renders outcome‑driven visual responses (accept / harmonic).

---

## 🧠 Conceptual Model

- The Being has a stable vector **v_being ∈ R⁷** (see `beings/*.json`).  
- The Aura visualizes the **current relation** between:  
  - Offered glyph vector **v_glyph**,  
  - Vessel cycle vector **v_cycle**,  
  - Breath phase gating **β**.  
- Coherence is evaluated by [CoherenceEngine.md](./CoherenceEngine.md); aura renders the outcome.

---

## 🔩 Structure

```
BeingAura
├─ ChestLocus (drop target)
├─ Halo (radial gradient / ring)
├─ Accents (rays, petals, tiny motes)
└─ Event effects
   ├─ accept: soft inflow, hue lift
   └─ harmonic: cross‑flare, crown corona, echo seeds
```

---

## 🔢 Types (TypeScript)

```ts
export interface BeingSpec {
  id: string;
  title: string;
  vec: Vec7;                    // being vector
  thresholds: { accept: number; harmonic: number };
  palette: { aura: string; crown?: string };
}

export type OutcomeKind = "reject" | "accept" | "harmonic";

export interface AuraConfig {
  chestRadius: number;          // px
  halo: { rInner: number; rOuter: number };
  rayCount: number;             // for corona
  echoSeeds: number;            // harmonic echo count
}

export interface BeingAuraIO {
  applyBreath(b: { phase: BreathPhase; value: number; velocity: number }): void;
  isInChest(p: {x:number;y:number}): boolean;
  react(outcome: { kind: OutcomeKind; score: number; accents?: Partial<Vec7> }): void;
  render(g: CanvasRenderingContext2D): void; // or SVG path ops
}
```

---

## 🌬 Breath Bindings

- **Inhale** → halo tightens (rOuter↓), luminance↑, saturation−.  
- **Exhale** → halo expands (rOuter↑), luminance−, saturation+.  
- **Pause** → hold radius steady; increase **Witness, Scale** accent.  

**Mapping** (suggested):  
`r = mix(rInhale, rExhale, t)` with `t = breath.value^0.75`.  
`alpha = α_base + α_gain * (phase==inhale? t : 1−t)`.

---

## 🧮 Outcome Effects

### Accept
- Halo bloom + **inflow** arcs toward chest.  
- Gentle **petal** accents along axes with highest contribution.  
- Optional tiny **glyph echo** at low alpha.

### Harmonic
- **Harmonic‑cross** flare (vertical × horizontal) at chest.  
- **Crown‑corona** rays (rayCount) with OKLCH chroma lift.  
- Emit `aura:harmonic` → [WitnessRadar.md](./WitnessRadar.md) to ripple.  
- Seed **echo glyphs** to radar arcs (non‑interactive).

### Reject (implicit)
- Snap‑back is handled by FocusVessel; aura stays neutral with slight cool tint.

---

## 🎨 Rendering Notes

- Prefer **Canvas2D** for smooth gradient halo & corona rays.  
- Use **SvgGlyph** for any small glyph echoes overlaying the chest.  
- Z‑order: BeingAura under SVG FocusVessel, above Background.  
- Use `Palette.get(being.palette.aura)` and `withBreathPhase` modulation.

---

## 📡 Events

- `aura:accept(score)`  
- `aura:harmonic(score)`  
- `aura:echo(glyphId, axes[])` — for WitnessRadar inscriptions

---

## 🧪 Testing

- Offer fixtures across the accept/harmonic thresholds → verify visual states.  
- Breath phase snapshots (inhale/pause/exhale) for halo radius & alpha.  
- Performance with `rayCount ∈ [8..36]` on mid‑range mobile.

---

## 🔗 Related

- [CoherenceEngine.md](./CoherenceEngine.md)  
- [WitnessRadar.md](./WitnessRadar.md)  
- [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)  
- [FocusVessel.md](./FocusVessel.md)

---
