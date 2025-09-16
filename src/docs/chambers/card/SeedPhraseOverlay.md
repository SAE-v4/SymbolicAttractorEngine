# SeedPhraseOverlay — Card Chamber

📍 Location: `src/docs/chambers/card/SeedPhraseOverlay.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

**SeedPhraseOverlay** renders short, ephemeral phrases produced by the [DialogueSystem](./DialogueSystem.md).  
It is intentionally sparse and lyrical: phrases appear briefly, breathe with the chamber, and dissolve.

---

## 🧠 Principles

- **Low verbosity**: 1–5 words, no punctuation (unless a template demands it).  
- **Breath‑synchronized**: opacity/scale track inhale/exhale/pause.  
- **Non‑modal**: never blocks input; it floats above the card UI.  
- **Legible**: high contrast against the current palette; avoids busy regions.  
- **Layer cohesion**: color and animation match Palette & BreathBindings.

---

## 🔄 Lifecycle

1. Receive `DialoguePhrase` (text + metadata).  
2. Layout: choose placement strategy (centered, arc‑aligned, or offset).  
3. Animate in (≈150–220 ms), hold (≈1.2–2.4 s), animate out (≈220–320 ms).  
4. Send `overlay:end` event for archives/metrics.

> Multiple phrases may queue; overlay should avoid stacking collisions by fading earlier entries faster when a new phrase arrives.

---

## 📐 Layout Modes

- **Centered** (default): text centered within the card frame.  
- **Arc‑aligned**: follow a gentle circular path (echoes WitnessRadar).  
- **Offset**: place in a clean corner depending on current glyph & aura glow.

**Collision rules** (suggested):  
- Keep 24–32 px clear of the FocusVessel and chest locus.  
- Prefer areas with low edge contrast (from palette’s grade info).

---

## 🎨 Styling

- Typeface: geometric sans or humanist (legible in small sizes).  
- Size range: 13–20 px base; scale ±6–10% with breath value.  
- Weight: 400–500; slight tracking on exhale.  
- Color: `Palette.get(key).text` with `withBreathPhase` modulation.  
- Shadow/halo: only if background becomes illegible (fade with breath).

---

## 🧩 Interface (TypeScript)

```ts
export interface SeedPhraseOverlay {
  show(phrase: DialoguePhrase): void;
  clear(): void;
  onEnd?: (id: string) => void;
}

export interface DialoguePhrase {
  id: string;
  text: string;
  tokens: string[];
  glyphs: GlyphId[];
  outcome: OutcomeKind;
  phase: BreathPhase;
}
```

---

## 🌬 Breath Bindings

- **Inhale**: opacity ↑, scale ↑ a touch, tracking −.  
- **Exhale**: opacity ↓ slightly after peak, tracking +.  
- **Pause**: hold opacity steady, remove tracking drift.

Breath is read from `BreathRuntime` (phase, value, velocity) and eased (e.g., `t^0.75`).

---

## 🧪 Testing

- Golden phrases (fixtures) to check entry/exit timings.  
- High‑contrast vs low‑contrast palettes.  
- Overlap scenarios (rapid phrase bursts).  
- Mobile legibility at DPR 2–3; safe areas for notches.

---

## 🔗 Related

- [DialogueSystem.md](./DialogueSystem.md)  
- [Palette.md](./Palette.md) *(planned)*  
- [BreathBindings.md](./BreathBindings.md) *(planned)*  
- [LoreArchiveView.md](./LoreArchiveView.md)

---
