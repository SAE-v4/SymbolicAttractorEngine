# Card Chamber Docs

> Directory: `src/docs/chambers/card/`

This folder collects **all documentation** for the Card‑layout chamber implementation.

## Quick Links

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

- **LoreArchiveView Reference** → [LoreArchiveView.md](./LoreArchiveView.md)
  **LoreArchiveView** is a lightweight, persistent list of phrases emitted during a session.
  
- **CoherenceEngine Reference** → [CoherenceEngine.md](./CoherenceEngine.md)  
  **CoherenceEngine** composes symbolic vectors (glyphs, vessel cycle, and being) and evaluates **coherence** for outcomes (reject/accept/harmonic).

- **BeingAura Reference** → [BeingAura.md](./BeingAura.md)  
  **BeingAura** is the **chest locus** and responsive glow of the chamber being.

- **WitnessRadar Reference** → [WitnessRadar.md](./WitnessRadar.md)  
  **WitnessRadar** visualises **coherence** and **stillness** as concentric arcs/rings in the walls layer. 

- **Renderers Reference** → [Renderers.md](./Renderers.md) 
  The **rendering contracts** used by the Card chamber

- **Palette Reference** → [Palette.md](./Palette.md)
  The **Palette** provides cohesive color keys across layers (background, aura, radar, glyphs, text) and exposes **breath‑aware** modulation helpers.

- **BreathBindings Reference** → [BreathBindings.md](./BreathBindings.md)
  Defines a small set of reusable curves to keep the chamber coherent and tunable.

- **CardState Reference** → [CardState.md](./CardState.md)
  **CardState** defines a minimal, testable **finite state machine** that coordinates user interaction and chamber reactions


- **Data Reference** → [Data.md](./Data.md)
  The **data layer** for the Card chamber

- **Vertical Slice Spec** → [CardLayoutChamber.md](./CardLayoutChamber.md)  
  A goal‑oriented spec for the playable vertical slice.

## Roadmap: Additional Docs (to be added)

- **AudioEngine.md** — stubs & contracts for breath pad / offer / receive / harmonic   
- **Data.md** — beings, glyphs, templates, lexicon schema notes

