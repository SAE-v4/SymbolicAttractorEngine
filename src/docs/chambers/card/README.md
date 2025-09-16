# Card Chamber Docs

> Directory: `src/docs/chambers/card/`

This folder collects **all documentation** for the Card‑layout chamber implementation.

## Quick Links

- **Vertical Slice Spec** → [CardLayoutChamber.md](./CardLayoutChamber.md)  
  A goal‑oriented spec for the playable vertical slice.

- **SemanticField Reference** → [SemanticField.md](./SemanticField.md)  
  The **Semantic Field** is the symbolic substrate of the Card chamber.

- **Glyph Reference** → [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)  
  Detailed glyph model (types, states, vectors, interactions, rendering).

- **FocusVessel Reference** → [FocusVessel.md](./FocusVessel.md)  
  **FocusVessel** is the chamber’s *active cursor* and *breath‑synchronized selector*.

- **GestureEngine Reference** → [GestureEngine.md](./GestureEngine.md)  
  The **GestureEngine** consumes raw pointer traces (mouse/touch) and classifies them into symbolic intents.

- **PhraseTemplates Reference** → [PhraseTemplates.md](./PhraseTemplates.md)
  The **PhraseTemplates** system defines how **tokens** (words) and **glyphs** combine into short, symbolic English phrases.

- **DialogueSystem Reference** → [DialogueSystem.md](./DialogueSystem.md)
  The **DialogueSystem** is responsible for **emitting text phrases** in the Card chamber.

- **SeedPhraseOverlay Reference** → [SeedPhraseOverlay.md](./SeedPhraseOverlay.md)
  **SeedPhraseOverlay** renders short, ephemeral phrases produced by the [DialogueSystem](./DialogueSystem.md).

- **LoreArchiveVie Reference** → [LoreArchiveVie.md](./LoreArchiveVie.md)
  **LoreArchiveView** is a lightweight, persistent list of phrases emitted during a session.
  
- **CoherenceEngine Reference** → [CoherenceEngine.md](./CoherenceEngine.md)  
  **CoherenceEngine** composes symbolic vectors (glyphs, vessel cycle, and being) and evaluates **coherence** for outcomes (reject/accept/harmonic).

## Roadmap: Additional Docs (to be added)

- **BeingAura.md** — chest locus + aura behaviors (breath & outcomes)  
- **WitnessRadar.md** — rings, echoes, ripples, coherence nods  
- **Palette.md** — color keys + breath modulation mapping  
- **AudioEngine.md** — stubs & contracts for breath pad / offer / receive / harmonic   
- **BreathBindings.md** — breath → anim & envelope bindings   
- **CardState.md** — FSM (idle → dragging → resolving → cooldown)  
- **Renderers.md** — SvgSprite/SvgGlyph/CanvasRadar contracts  
- **Data.md** — beings, glyphs, templates, lexicon schema notes

> Tip: Keep this index short and let each sub‑page stand alone with a “Back to index” link to this README.
