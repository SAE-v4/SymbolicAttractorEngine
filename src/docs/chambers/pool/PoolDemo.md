
# Pool Chamber Demo Spec — Breathing Bands & Lens Loop

This document captures the shared design for a **demo chamber** that showcases
the breathing-band visuals, the four lenses, and simple user interaction.
It is intended for drop-in under `src/docs/chambers/PoolDemo.md`.

---

## Goals

- **Show the law**: breath as bands (one system, many projections).
- **Show the lenses**: observatory ↔ garden ↔ witness ↔ organ (meso rhythm).
- **Let the user touch it**: a simple trace creates echoes (soft offering),
  but *bands keep breathing* underneath.
- **Be re-usable**: the band visuals are a shared module any chamber can host.

---

## User Experience (2–3 minute day loop)

1. **Dawn → Observatory**  
   Horizontal horizons breathe; a phase glimmer hints the switch.

2. **Day → Garden**  
   Horizons soften into bloom-like bands.

3. **Dusk → Witness**  
   Concentric rings; user traces create ripples.

4. **Night → Organ**  
   Peristaltic tissue waves; visuals quieten, nourishing.

Loop repeats; user can draw anytime—echoes feel different in each lens.

---

## Systems

- **BreathRuntime (micro)**: seconds. Outputs `BreathSample`.
- **EngineClock (meso)**: minutes. Outputs `DayPhase`, `day01`.
- **LensSelector**: `(DayPhase) -> Lens` mapping.
- **Palette**: `(breath, lens, macroHue) -> colors`.
- **BandsRenderer** (shared): projects breath into geometry by `lens`.
- **PhaseGlimmer**: intensifies/morphs on phase edges.
- **Echoes**: gesture ripples/ghosts.

---

## Lens Mapping

- Dawn → **Observatory** (Horizons)
- Day → **Garden** (Bloom)
- Dusk → **Witness** (Radial Rings)
- Night → **Organ** (Tissue / Metabolic)

*(Mappings can be adjusted/renamed later if needed for clarity.)*

---

## Transitions

- **Between lenses**: morph, don’t cut (600–900ms cross-fade of geometry).
- **Phase glimmers**: quick (150–400ms) brightness/chroma lift at phase edges.

---

## Interaction

- Pointer/touch draws a trace.  
- On release: classifier emits `{kind, dir?, confidence, centroid}`.  
- Pool chamber spawns echoes + emits `pool:seed`.  
- Bands never stop; they refract briefly at the impact site (local shimmer/shear/lens).

Interaction weight: **Strong** (for demo).

---

## Audio

- **On by default**.  
- Breath pad: inhale/exhale filter + volume.  
- Accent samples on echo spawn: spiral / zigzag / hold.  
- Match glimmer timing.

---

## Renderer

- **Canvas2D first**.  
- Later: GL backend with the same `BandRenderer` interface, using existing `FieldBG`/`CardBG` shaders.

---

## Success Criteria

- Users can **name the lenses** after one loop without labels.  
- Traces feel **received** (ripples/ghosts) but do not hijack the breath.  
- Switching lenses feels like **morphing the same rhythm**, not scene cuts.  
- Bands look/feel consistent across all chambers that host them.

---

## Architecture Notes

- **Shared modules**: `systems/breath`, `systems/clock`, `systems/color/Palette`, `visuals/BandsRenderer`.
- **BandsRenderer**: pure function of `(breath, lens, palette, glimmer, macroHue)`.
- **Chambers**: thin shells that *host* the shared renderer and add their overlays.

---

## Storyboard (2-minute day)

- 0:00–0:12 **Night / Organ**: dark tissue; slow pad.  
- 0:12–0:24 **Dawn / Observatory**: glimmer; horizons appear; palette warms.  
- 0:24–1:24 **Day / Garden**: bloom bands; playful traces.  
- 1:24–1:48 **Dusk / Witness**: rings; ripples strongest.  
- 1:48–2:00 **Night / Organ**: cool; echoes soften.  
- Repeat.

---
