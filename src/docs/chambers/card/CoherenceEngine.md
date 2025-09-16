# CoherenceEngine — Vec7 Composition & Scoring

📍 Location: `src/docs/chambers/card/CoherenceEngine.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose
**CoherenceEngine** composes symbolic vectors (glyphs, vessel cycle, and being) and evaluates **coherence** for outcomes (reject/accept/harmonic). It is the semantic heart of offering.

---

## 🧠 Model
Vectors live in **R^7** with axes: `[Light, Warmth, Heart, Flame, Inhale, Scale, Witness]`.

- **Glyph**: `v_glyph` (from `GlyphSpec.vec`)  
- **Vessel cycle**: `v_cycle` (from FocusVessel)  
- **Being**: `v_being` (from `beings/…json`)  
- **Breath**: `β` in [0..1], phase‑aware gates

### Composition
Form a **phrase vector**:
`v_phrase = norm( w1·v_glyph + w2·v_cycle )`  
`w1, w2` can be breath‑dependent (e.g., inhale favors `v_cycle`).

Then compute **coherence score** with the Being:
`score = cos(v_phrase, v_being) = (v·b) / (||v||·||b||)`

### Phase gating
Apply breath gating to avoid false positives near holds or low energy:
`score' = score · gate(β, phase)`

Example gate: during **pause**, boost **Witness** and **Scale**, slightly reduce **Flame**.

---

## 🧪 Outcome Resolution

```ts
interface Thresholds {
  accept: number;    // e.g., 0.72
  harmonic: number;  // e.g., 0.86
}

type OutcomeKind = "reject" | "accept" | "harmonic";

interface Outcome {
  kind: OutcomeKind;
  score: number;
  phraseVec: Vec7;
  accents?: Partial<Vec7>; // axis highlights for visuals
}
```

**Rules**
- `score' < accept` → **reject** (snapBack)
- `accept ≤ score' < harmonic` → **accept**
- `score' ≥ harmonic` → **harmonic**

**Accents** can highlight which axes contributed most (for WitnessRadar glyph echoes or Harmonic‑cross intensity).

---

## 🔧 API

```ts
export function composePhraseVec(vGlyph: Vec7, vCycle: Vec7, breath: Breath): Vec7
export function scorePhrase(vPhrase: Vec7, vBeing: Vec7, breath: Breath): number
export function resolveOutcome(score: number, th: Thresholds): OutcomeKind
```

---

## 🧪 Testing

- Orthogonal vectors → low scores; identical → 1.0; opposite → −1.0.  
- Breath gates vary outcome across phases (inhale vs exhale).  
- Fixture table of (`v_glyph`, `v_cycle`, `v_being`, phase) → expected outcomes.  

---

## 🔗 Related
- [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)
- [FocusVessel.md](./FocusVessel.md)
- *(Planned)* BeingAura.md, WitnessRadar.md
