# Semantic Field — Card Chamber

📍 Location: `src/docs/chambers/card/SemanticField.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

The **Semantic Field** is the symbolic substrate of the Card chamber.  
It is a 7D vector field where glyphs, tokens, and phrases take position, and where **breath phases** modulate meaning.

This document unifies **glyph vectors**, **lexical tokens**, **phrase templates**, and **breath dynamics** into a single conceptual map.

---

## 🧭 7D Axes

The working field has seven axes:  

`[Light, Warmth, Heart, Flame, Inhale, Scale, Witness]`

Each axis contributes to meaning:

- **Light** — clarity, polarity (light/shadow).  
- **Warmth** — affinity, seasonal energy.  
- **Heart** — center of coherence, stability.  
- **Flame** — action, offering, release.  
- **Inhale** — gathering, contraction.  
- **Scale** — measure, balance, seal.  
- **Witness** — stillness, pause, crown.

**Mappings:**  
- Glyphs carry vectors in this space.  
- Tokens tag words with partial vectors.  
- Phrases draw arcs across axes.  
- Breath weights axes differently by phase.

---

## 🔡 Tokens & Tagging

**Tokens are words, not glyphs.**  
They are stored in `lexicon.json` and used in seed phrases & metabolic flows.

Each token carries a partial vector affinity:  

```json
{
  "word": "gift",
  "vec": [0.0, 0.2, 0.3, 0.1, 0.0, 0.0, 0.1]
}
```

- `word` → English string.  
- `vec` → axis weights in 7D.  
- Can be combined with glyphs in phrase templates.

---

## 🌀 Phrases & Diagrams

- **Phrase templates** (in `templates.json`) define structures like:  
  - “Gift of X”  
  - “X within Y”  
  - “The Crown of X”  

- **Phrase diagrams** (in `diagram_phrases.json`) are chamber-scale expressions:  
  - Expanded geometries (spirals, clusters, halos).  
  - Bound to breath dynamics.  
  - Can manifest as **WitnessRadar** echoes.

**Levels of phrase (nested):**  
1. Text token (word).  
2. Glyph seal (compact form).  
3. Diagram phrase (full chamber law).

---

## 🌬 Breath Dynamics

Breath is the **metronome** of the semantic field.  

- **Inhale** → contraction, intensifies Light, Heart, Inhale.  
- **Exhale** → expansion, strengthens Warmth, Flame.  
- **Pause** → still point, elevates Witness, Scale.  

Each glyph, token, and phrase has breath states: `inhale`, `exhale`, `pause`.  
Animations, colors, and sounds modulate accordingly.

---

## 🔄 Interactions in the Card Chamber

1. **FocusVessel**  
   Samples glyphs by cosine similarity in 7D, driven by breath + gestures.  

2. **GestureEngine**  
   Injects transient vector accents (`dv`), shifting the vessel’s cycle.  

3. **CoherenceEngine**  
   Scores `glyph + vessel` against the Being vector, resolving outcome.  

4. **DialogueSystem**  
   Selects tokens and phrase templates → renders text overlays.  

5. **WitnessRadar**  
   Projects diagram glyphs as echoes of coherence and outcome.

---

## 🔗 Related Docs

- [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)  
- [FocusVessel.md](./FocusVessel.md)  
- [CoherenceEngine.md](./CoherenceEngine.md)  
- *(Planned)* PhraseTemplates.md, DialogueSystem.md  

---
