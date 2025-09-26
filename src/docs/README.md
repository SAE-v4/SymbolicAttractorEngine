# Symbolic Attractor Engine — Documentation Index

This folder collects design notes and reference docs for SAE.
They are not always in lock-step with the code, but provide a map of
the architecture, concepts, and experiments.

---

## Core Concepts

- [Observer.md](Observer.md)  
  *User Agent model: aperture, bias, cadence, dwell, seal. How gestures
  and breath attune the 7D Semantic Field.*


### Gestures

- [GestureVocabulary.md](./gestures/GuestureVocabulary.md)  
  *Catalogue of core gesture families and subtypes, with symbolic tags.*

- [GestureLaws.md](./gestures/GestureLaws.md)  
  *Gesture families (Cut, Zigzag, Spiral, Hold, Seal, Flick) and their
  symbolic laws.*

- [LensAndChamberMatrix.md](LensAndChamberMatrix.md)  
  *Overview of breath lenses (Observatory, Garden, Organ, Witness) and
  chamber modes (Pool, Card, SpiralGate, Archive, Mirror).*

---

## Chamber Specs

- [chambers/pool/README.md](chambers/pool/README.md)  
  *Pool chamber: bands, echoes, seeds, witness radar. Foundational,
  reflective, instrumental.*

- [chambers/card/README.md](chambers/card/README.md)  
  *Card chamber: being presence, aura, vessel cycle, phrase templates.
  Outward and structured.*

---

## Shared Modules

- Palette & Color ([systems/color/Palette.ts](../systems/color/Palette.ts))  
  *Lens + breath aware color derivation.*

- BandsRenderer ([chambers/pool/layers/BandLayer2D.ts](../chambers/pool/layers/BandLayer2D.ts))  
  *Visualisation of breath as horizons / rings / tissue, per lens.*

---

## Legacy & Experiments

- SpiralGate.md, SolarSpiralGate.md, FlowChamber.md, LexiconChamber.md  
  *Earlier explorations. Kept for historical reference and ideas, not
  active in current architecture.*

---

## Notes

- **Docs are reference aids.** They help keep track of architectural
  directions and symbolic language.  
- **Code is the source of truth** for current implementation.  
- **Vertical slices** should update docs minimally, only to keep key
  connections alive.

