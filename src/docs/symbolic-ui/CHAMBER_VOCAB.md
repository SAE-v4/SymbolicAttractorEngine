# Chamber Vocabulary (Symbolic UI)

This document describes the symbolic vocabulary used in SAE chamber visualisation.
It provides a bridge between **concept**, **glyphs**, and **implementation**.

---

## 1. Levels of Expression

Each symbolic phrase exists at three nested levels:

1. **Base Glyphs**

   * The atomic forms (dot, circle, line, spiral, heart, flame, droplet, crescent, vesica).
   * Think of these as the “letters” of the symbolic alphabet.
   * See [`src/data/base_glyphs.json`](../../src/data/base_glyphs.json).

2. **Phrase Glyphs**

   * Compact seals composed of base glyphs.
   * Represent the **seven chamber phrases** (Light/Shadow, Warmth/Coolness, etc.).
   * Used in UI overlays, constellations, or to trigger diagram expansions.
   * See [`src/data/phrase_glyphs.json`](../../src/data/phrase_glyphs.json).

3. **Diagram Phrases**

   * Full chamber expressions of each phrase, with geometry, breath dynamics, and seasonal emphasis.
   * These are what the chamber renders visually and rhythmically.
   * See [`src/data/diagram_phrases.json`](../../src/data/diagram_phrases.json).

---

## 2. The Sevenfold Set

The working set of phrase glyphs and diagrams is sevenfold:

1. **Light / Shadow** – polarity law, vertical axis.
2. **Warmth / Coolness** – affinity cluster, triangular with orbit.
3. **Heart / Spirit** – ascent law, heart below, spirit spiral above.
4. **Flame / Offering** – deed as gift, flame rising from vessel.
5. **Inhale / Exhale** – breath law, spiral with central pause.
6. **Scale / Seal** – measured union, balance with seed.
7. **Witness Equilibrium** – crown, circle with central point.

Each has:

* a **title** (English phrase),
* a **glyph** (SVG-style mark),
* a **diagram** (expanded visual law with breath),
* a place in the **sevenfold cycle**.

---

## 3. Breath Dynamics

Every diagram phrase includes **inhale / exhale / pause states**.
These dynamics are not just animations but part of the symbolic law:

* **Inhale** = contraction, gathering, intensification.
* **Exhale** = expansion, release, expression.
* **Pause** = still point, witness, seed.

Breath is the **metronome** that unifies the whole vocabulary.

---

## 4. Seasonal & Narrative Mapping

* Each phrase has a **seasonal resonance** (e.g. Warmth/Coolness in Spring, Flame/Offering in High Summer).
* Together they form a **narrative cycle**: from polarity → cluster → ascent → offering → breath → seal → witness.
* This cycle is recursive: after Witness, it begins again.

See [`src/data/cycle_sevenfold.json`](../../src/data/cycle_sevenfold.json) for order + narrative lines.

---

## 5. Usage Notes

* **UI Layer**: Phrase glyphs can be displayed compactly (icons, constellations).
* **Chamber Layer**: Diagram phrases expand into full visual/breath expressions.
* **Interaction**: The Bee or user gestures may “tune” glyphs to unfold into diagrams.
* **Extensibility**: Future phrases can be added by composing new glyphs from the base set.

---

## 6. Visual References

See `docs/symbolic-ui/images/` for:

* `base-glyphs.png` – atomic set
* `seven_glyphs_chart.png` – working set of phrase glyphs
* diagram mockups for each phrase

---

## 7. Next Steps

* Define **renderer contracts** (e.g. `renderGlyph(id, size)`, `renderDiagram(id, phase)`).
* Wire breath timing into diagrams.
* Experiment with multiple glyphs active in chamber constellations.
* Expand vocabulary cautiously, keeping modular composability.

---

Would you like me to also draft a **short `README.md`** for the `docs/symbolic-ui/` directory itself (lighter than `CHAMBER_VOCAB.md`, more like an index)? That way you’d have both a **landing page** and a **deep reference** side by side.
