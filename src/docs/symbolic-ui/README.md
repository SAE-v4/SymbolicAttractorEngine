# Symbolic UI (Chamber Vocabulary)

This directory contains the **symbolic vocabulary** for the SAE chamber system.  
It complements the engine code by defining the *alphabet* of glyphs, phrases, and diagrams used for visualisation and interaction.

## Contents

- **[CHAMBER_VOCAB.md](./CHAMBER_VOCAB.md)**  
  Human-readable reference for the vocabulary:  
  - Base glyphs (atomic forms)  
  - Phrase glyphs (compound seals)  
  - Diagram phrases (expanded, breathing forms)  
  - Sevenfold cycle and narrative mapping  

- **schema/**  
  JSON Schemas for data definitions:  
  - `base_glyph.schema.json`  
  - `phrase_glyph.schema.json`  
  - `diagram_phrase.schema.json`  
  - `cycle.schema.json`  

- **images/**  
  Reference visuals:  
  - `base-glyphs.png`  
  - `seven_glyphs_chart.png`  
  - mockups of diagram phrases  

## Usage

- **Developers**: see `src/data/` for JSON instances that conform to these schemas.  
- **Artists/Designers**: see `images/` for visual reference when creating or refining glyphs.  
- **Contributors**: start with `CHAMBER_VOCAB.md` to understand how base glyphs combine into phrases and how diagrams express them in the chamber.

---

_This vocabulary is a living system. Future work will link these definitions directly into rendering contracts and chamber logic._
