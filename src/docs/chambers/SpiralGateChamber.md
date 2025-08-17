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


