# SpiralGate — README

> Location: `src/docs/chambers/SpiralGate.md`

## Overview
**SpiralGate** is the base *gate* archetype: a breathing sky field and a circular **Gate Aura** that responds to the witness’ breath and alignment. It does **not** include the spiral ribbon/traveler (see **SolarSpiralGate** for that extension).

**Layer stack (back→front):**
1. **Sky background** — gradient + breathing bands (GL or 2D, implementation‑agnostic)
2. **Gate Aura** — halo pulse + ring
3. **Witness** (optional) — avatar/marker
4. **Debug overlay** (optional)

## Inputs
- **BreathRuntime** → `{ phase, breath01, breathSS, velocity, tCycle }`
- **Gate model** → `{ center, rGate }` and gate hit detection
- **Palette** (OKLCH) → shared across layers (GL uses linear sRGB, 2D uses `oklch()`)
- **Flags** → debug toggles and visual grade/band params

## Events & Meaning
| Event | Visual |
|---|---|
| inhale start | bands widen / reverse drift; aura brightens |
| hold‑in | aura steadies; tiny bloom |
| exhale start | bands narrow / advance; aura softens |
| hold‑out | scene dims a touch |
| **gate hit** | GateFlash pulse on ring |
| **cycle complete** | brief global bloom |

## Color System (OKLCH)
- **Anchors**: small curated pairs within one family (e.g., *Dawn ↔ September*).
- **Breath mapping**: `t = breath01^0.75`. L and C rise gently on inhale, tiny H drift (≤10° total).
- **Unification**: one palette function feeds GL (linear sRGB uniforms) and 2D (`oklch()` strings).
- **Holds**: hold‑in → slightly higher L, slightly lower C; hold‑out → slightly lower L & C.

## Render Order (reference)
1. Clear or fade‑clear background
2. Draw sky field (bands/gradient)
3. Draw Gate Aura (halo + ring)
4. Draw witness glyph (if used)
5. Draw debug overlay (optional)

## Tuning Notes
- **Deeper evening** → increase grade lift/gamma slightly, a touch more saturation, modest vignette
- **Less “shutter”** → lower band frequency, enable AA via `fwidth`, blend rect+sine, add slight horizontal tilt
- **Legibility** → ensure ring/ribbon (if later added) contrasts against both light and dark bands

## Extension points
- **Audio**: pad/pip/swell mapped from breath + gate events
- **Haptics**: light tap on gate hit (iOS)
- **Presets**: “Dawn/Noon/September/Dusk/Eclipse” as palette packs
