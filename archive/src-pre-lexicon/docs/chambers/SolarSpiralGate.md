# SolarSpiralGate — README

> Location: `src/docs/chambers/SolarSpiralGate.md`

## Overview
**SolarSpiralGate** extends *SpiralGate* with a **spiral ribbon** (knots) and a **traveler bead** easing knot‑to‑knot. The GL sky shows breathing bands; a central **Gate Aura** flashes on gate hits; the traveler’s motion and gate crossings give a legible rhythm tied to breath.

**Layer stack (back→front):**
1. **SkyGLRenderer (GL)** — gradient + breathing bands + grade
2. **GateAuraSystem (2D)** — halo pulse + ring (under ribbon)
3. **SpiralSceneSystem (2D)** — ribbon, knots, traveler (path‑follow + angle)
4. **DebugOverlaySystem (2D, optional)** — HUD & guides

## Inputs & Systems
- **BreathRuntime** → `{ phase, breath01, breathSS, velocity, tCycle }`
- **Palette driver (OKLCH)** → GL uniforms (linear sRGB) & 2D `oklch()` strings
- **Presets** → `spiralCfg`, `ringClock`, `travelerCfg`
- **Canvases** → GL base + 2D scene (+ optional debug overlay)

**Systems**
- `SkyGLRenderer` — GL shader with band + grade controls
- `GateAuraSystem` — radial gradient + ring; driven by `GateFlash.energy`
- `SpiralSceneSystem` — polyline ribbon, knot glows, traveler easing & orientation
- `DebugOverlaySystem` — on‑screen guides + readouts
- *(Later)* `AudioSystem` — pad / pip / cycle swell (scheduled off BreathRuntime)

## Events & Meaning
| Event | Visual |
|---|---|
| inhale start | bands widen / reverse drift; aura brightens |
| hold‑in | aura steadies; tiny bloom |
| exhale start | bands narrow / advance; aura softens |
| hold‑out | scene dims a touch |
| **gate hit** (ring crosses knot) | knot glow ping + GateFlash pulse |
| **traveler move** | bead eases to next knot with slight normal “lean” |
| **cycle complete** | brief global bloom |

## Color System (OKLCH)
- **Anchors** (mood axis within one family). Current: **DAWN ↔ SEPTEMBER** (`DAWN_TOP/BOT`, `SEPT_TOP/BOT`).
- **Breath mapping**: `t = breath01^0.75` (inhale bias). L and C rise gently; H drift small (≤10° total).
- **Reversal/feel**: `breathSS` flips band drift and adds ±3–5° hue sway. `velocity` creates micro “pops” (flash/ribbon bloom).
- **Unification**: one palette function returns **linear sRGB** (GL) and `oklch()` strings (2D).
- **Holds**: hold‑in → L↑, C↓ a hair; hold‑out → L↓, C↓.

## GL Bands — Recommended Ranges
- `u_bandFreq`: **4.8–6.2** (broader = calmer)  
- `u_bandDriftBase`: **0.08–0.12 s⁻¹**; `u_bandDriftGain`: **0.15–0.25 s⁻¹**
- `u_bandAlphaBase`: **0.10–0.18**; `u_bandAlphaGain`: **0.16–0.26**
- **Grade**: `yGamma 1.20–1.35`, `gradeLift 0.030–0.040`, `gradeSat 1.10–1.20`, `vignette 0.14–0.22`
- **Softening**: use `aa = max(fwidth(x), 0.004)`; `soften ≈ 0.80–0.85`; slight `cycles += 0.15*uv.x` tilt

## Render Order (reference)
1. Sky (GL)
2. Gate Aura (2D, behind ribbon)
3. Spiral ribbon / knots / traveler (2D)
4. Debug overlay (2D)

## Debug Experience
**Overlay (symbolic):** min‑dim circle, center crosshair, `rGate` ring; breath HUD; spiral outline + knots; traveler with tangent arrow; optional FPS sparkline.  
**Panel (DOM):** toggles (overlay flags); sliders for grade & bands; buttons: Reset, Hide, Test Flash.

**Hotkeys:** `D` overlay, `B` breath HUD, `G` gate, `S` spiral, `T` traveler, `P` palette.  
**Mobile:** triple‑tap toggles overlay; two‑finger double‑tap toggles panel.

## Vertical Slice Checklist
- [ ] GL sky bands: duty breathing + drift reversal + grade
- [ ] Gate Aura flash: triggered on knot hits; correct z‑order/clear order
- [ ] Spiral ribbon + traveler: eased path‑follow + angle
- [ ] Unified palette driver (OKLCH → GL+2D)
- [ ] Debug overlay + panel (hotkeys/gestures)

*(Optional)* peristaltic ribbon (tiny amp, breath‑modulated); bands softening/tilt polish
