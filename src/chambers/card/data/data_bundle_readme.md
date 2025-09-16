# Card Chamber Schema Bundle

This archive collects JSON Schema files relevant to the Card‑layout chamber
and symbolic‑UI data structures.

## Included Schemas

- **base_glyph.schema.json** — Core glyph specification (id, kind, vec7, breathAnim, etc.)
- **phrase_glyph.schema.json** — Links glyph ids to phrase tokens for dialogue/overlay.
- **diagram_phrase.schema.json** — Higher‑order phrase diagrams (e.g. harmonic‑cross, aura‑radar).
- **cycle.schema.json** — Generic breath/phase cycle definition.
- **cycle_sevenfold.schema.json** — Extended sevenfold cycle (light, warmth, heart, flame, inhale, scale, witness).

## Usage

Import and validate content JSON (`glyphs.json`, `beings.json`, `templates.json`)
to ensure consistency across engine systems.
