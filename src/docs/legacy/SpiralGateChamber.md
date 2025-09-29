### Purpose

The SpiralGateChamber presents a breathing, banded sky and a circular gate that responds to the witness’ motion, alignment, and breath—visually and sonically.

### Inputs

- Tempo: phase ∈ [0..1) from services.tempo.phase().
- MotionSystem: { pos, vel, facing, thrust } in screen/CSS px.
- FlowGate: readout fields including { progress, sAlign, sBreath, sCoherent, center, radius }.
- Flags: tuning (accel, maxSpeed, softWall, gateDir, thresholds).

### Systems

- MotionSystem: Integrates input → kinematics; handles soft walls; exposes resize().
- FlowGate: Computes alignment/coherence vs gate; exposes readout + justOpened().
- AudioSystem: Maps phase + gate coherence + witness state → pads, pulses, shimmer.

### Render Order

1. Clear: clearRect(0,0,w,h) (or fade fill if intentional trails).
2. PhaseFX (background): subtle breathing gradient + horizontal luminous bands.
3. GateRenderer: ring stroke + inner bloom/glow + optional coherence halo.
4. WitnessRenderer: avatar & thrust UI (source-over).
5. Debug (optional): position/facing overlay, readouts.

```javascript

// pseudocode
clear();
drawPhaseFX(ctx, phase, w, h);              // source-over, then lighter (isolated)
drawGate(ctx, w, h, gate.readout, bloom);   // isolated blocks, returns state clean
drawWitness(ctx, motion.pos, motion.vel, motion.facing, motion.thrust);
if (DEBUG) drawWitnessDebug(ctx, motion.pos, motion.facing);

```

### Audio Mapping (current)

- breath = sin(2π·phase) gates low pad and band alpha.
- coherence = sAlign * sBreath * sCoherent modulates shimmer/air band-pass.
- justOpened → short transient; stereo pan from pos.x / w.

### Tuning Knobs

- ring width = 6 + 12·progress + 10·bloom
- inner glow alpha clamp ≤ 0.9
- band spacing/thickness in PhaseFX; global alpha = 0.25 + 0.25·breath.

### Gotchas

- DPR: We resize canvas to DPR and keep identity transform; all values are CSS px.
- Compositing: Wrap any use of "lighter"/shadows in save/restore.
- Trails: Only via deliberate fade fills; default is hard clear.


# SolarSpiralGate — Color × Breath & Audio Map

## Chamber language (quick glossary)

* **Sky (GL):** breath field and mood (bands, gradient, grade).
* **Gate Aura:** awareness center; halo + ring pulse.
* **Spiral Ribbon:** path; peristaltic living line.
* **Knots:** milestones (gate hits).
* **Traveler:** attention/seed gliding along the path.

---

## Color × Breath — conceptual map

**Anchors.** Keep a small set of OKLCH anchor pairs per “mode” (e.g., *Dawn ↔ September*, *Noon ↔ Dusk*, *Lunar*). Current:

* **DAWN\_TOP/BOT** (cooler, lower chroma)
* **SEPT\_TOP/BOT** (richer, deeper)

**Breath mapping.**

* `breath01` (0→1 across the cycle): lerp **L** and **C** (optionally a small **H** drift). Use a gentle bias, e.g. `t = breath01^0.75`, so inhale feels slightly more “rewarding.”
* `breathSS` (signed slow): steer direction changes (band drift reversal, subtle hue sway ±3–5°).
* `velocity` (signed fast): micro pops — flash/halo gain, tiny ribbon bloom, pip loudness.
* **Holds:** hold‑in → slightly higher L, slightly lower C (clarity). Hold‑out → slightly lower L, lower C (quiet).

**Unification.** Both GL **and** 2D layers read from the same OKLCH profile and output either **linear sRGB** (GL uniforms) or `oklch()` strings (2D). Grade (gamma/lift/sat/vignette) stays a post layer; each profile can nudge grade a little.

**Module layout (`src/color/`).**

* `profiles.ts` — named anchor sets (e.g., `dawn_september`, `noon_dusk`, `lunar`).
* `breathPalette.ts` — `breathPalette(profile, breath): { skyTop, skyBot, ribbon, aura, ring }` in both linear (for GL) and `oklch()` strings (for 2D).
* `oklch.ts` — utilities (hue‑wrap, mix, conversions) shared by GL + 2D.

---

## Events & meaning (visual + audio)

| Event                            | Visual                                      | Audio                                                                  |
| -------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| inhale start                     | bands widen / reverse drift; aura brightens | pad gain up + LPF opens a touch                                        |
| hold‑in                          | aura steadies; tiny bloom                   | short shimmer tail (verb/chorus)                                       |
| exhale start                     | bands narrow / advance; aura softens        | pad dips + LPF closes slightly                                         |
| hold‑out                         | scene dims a touch                          | hush (noise floor + long verb)                                         |
| **gate hit** (ring crosses knot) | knot glow ping + GateFlash pulse            | soft pip (sine/triangle + tiny band‑pass click); velocity → brightness |
| **cycle complete**               | brief global bloom                          | very subtle sub/woosh                                                  |

---

## Audio — minimal palette to match the chamber

**Bed (pad / wind).** 2–3 oscillators → gentle LPF → chorus → long reverb.

* `breath01` → LPF cutoff (≈400→2.2k Hz) & pad gain (≈−12→−6 dB).
* `breathSS` → subtle vibrato depth.
* Add a band‑limited noise layer whose drift follows GL bands (with reversal).

**Pip (knot hit).** Short sine/triangle (≈440–880 Hz) + tiny band‑pass noise click.

* Map `velocity` to attack/level (±20%).
* Optional pitch ladder outward to suggest radial travel.

**Cycle swell.** Soft sub or breathy woosh at cycle wrap; ducked under pad.

**Hold harmonics (optional).** Brief harmonic tone during holds (≤7 s), decays on motion.

**Scheduling.** Use WebAudio ahead‑of‑time scheduling (\~120 ms look‑ahead). Drive from BreathRuntime events, not RAF. Keep a light event bus:

* `breath:phaseStart(inhale|exhale|holdIn|holdOut)`
* `breath:cycleWrap`
* `gate:knotHit(index)`
* `traveler:move(start|end, from, to)`

---

## Near‑term roadmap (concise)

1. **GateFlash rewire**: ensure `SpiralSceneSystem` calls `onKnotHit(i)`; chamber triggers flash; verify z‑order/clear order.
2. **Unify palette driver**: implement `breathPalette()` and use in GL & 2D.
3. **Peristaltic ribbon**: subtle amp, modulated by `breath01`; traveler stays on base path.
4. **Audio MVP**: pad + pip + cycle swell; map the events above with 120 ms scheduler.
5. **Witness glyph**: scales/glows with `breathSS`, responds to traveler proximity.

---

## Tuning notes (quick dials)

* Deeper evening: `gradeLift↑`, `yGamma↑`, `gradeSat↑ slightly`, `vignette↑`.
* Fewer, softer bands: decrease `bandFreq`, use AA `max(fwidth(x), 0.004)`, add tiny `cycles += 0.15*uv.x` tilt.
* Color expressivity: increase chroma span on inhale (ΔC), keep hue drift small (≤10°) to stay in one blue family.
