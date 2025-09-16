# FocusVessel — 7D Cycle UI

📍 Location: `src/docs/chambers/card/FocusVessel.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose
**FocusVessel** is the chamber’s *active cursor* and *breath‑synchronized selector*.  
It presents one or more **glyphs** at the vessel center, moves through a **7D semantic cycle**, and exposes gesture affordances (trace‑spiral, trace‑zigzag, tap‑hold) that *conduct* tempo, direction, and coherence.

> MVP shows one glyph; full design supports **multi‑slot** lanes and **7D phase‑aware selection**.

---

## 🧠 Role in the 7D System
The FocusVessel expresses a position in the seven‑axis field:  
**Vec7 = [Light, Warmth, Heart, Flame, Inhale, Scale, Witness]**.

- It maintains a **cycle vector** `vCycle ∈ R^7` that changes with breath and gesture.  
- The **current glyph** is chosen by scoring its `vec` against `vCycle` (cosine similarity).  
- Gestures modulate `vCycle` and the **advance operator** (speed, direction, jitter).  
- On **offering**, `vCycle` is composed with the offered glyph and the Being vector to determine outcome (accept/harmonic/etc).

---

## 🧩 Structure (conceptual)

```
FocusVessel
├─ Slots (1..N)
│  ├─ currentGlyphId
│  ├─ animState (idle/hover/dragging/offered)
│  └─ transforms (scale, opacity) ← breath + breathAnim
├─ Cycle
│  ├─ vCycle: Vec7
│  ├─ dir: +1|-1 (zigzag flips)
│  ├─ speed: base from BreathRuntime, mod from spiral gesture
│  └─ jitter: micro noise (optionally bound to “Scale” axis)
└─ IO
   ├─ drag origin & drop targets
   ├─ gesture buffer (for trace classification)
   └─ events (onCycle, onSelect, onOffer, onSnapBack)
```

---

## 🔢 Data Contracts (TypeScript)

```ts
export type Vec7 = [number, number, number, number, number, number, number];

export interface VesselConfig {
  slots: number;                 // default 1
  cycleBias?: Partial<Vec7>;     // per-chamber bias (e.g., late-spring)
  speedBase?: number;            // radians/s in phase space (nominal)
  speedGainSpiral?: number;      // spiral gesture acceleration
  jitterAmp?: number;            // subtle noise on Scale axis
  reverseOnZigzag?: boolean;     // default true
  pauseOnHold?: boolean;         // Heart-hold pauses cycle (default true)
}

export interface VesselState {
  vCycle: Vec7;
  dir: 1 | -1;
  speed: number;
  t: number;                      // cycle phase 0..1 mapped from breath phase
  selectedGlyphId: GlyphId;
  slots: Array<{
    glyphId: GlyphId | null;
    animState: "idle"|"hover"|"dragging"|"offered";
    scale: number;
    opacity: number;
  }>;
}

export interface VesselIO {
  applyBreath(b: { phase: "inhale"|"pause"|"exhale"; value: number; velocity: number }): void;
  applyGestureEffect(e: GestureEffect): void;
  advance(dt: number): void;
  pick(): GlyphId;                // recompute selected glyph by 7D cosine
  dragStart(x:number,y:number): void;
  dragMove(x:number,y:number): void;
  dragEnd(x:number,y:number): void;
  snapBack(): void;
}
```

---

## 🧭 7D Cycle Mathematics

### 1) Basis and bias
Let **E** be the 7D canonical basis. Configure a **bias** vector `b` for chamber mood (seasonal or being‑specific).  
`vBase(breath) = f_breath(breath) ⊙ b + (1−λ)·b0`, where `b0` is neutral defaults and `⊙` is elementwise.

- Breath mapping (suggested):  
  - Inhale raises **Light, Heart, Inhale** components.  
  - Exhale raises **Warmth, Flame** (out‑breath activity).  
  - Pause emphasises **Witness, Scale** (stillness & measure).

### 2) Spiral acceleration (gesture)
Spiral gesture increases angular velocity in subspace **[Inhale, Scale]** and adds a small rotation in **[Light, Heart]** plane.

### 3) Zigzag reversal (gesture)
Zigzag flips `dir`, and injects a transient into **[Shadow (−Light), Flame]** to express polarity flip.

### 4) Heart‑hold (gesture)
Temporarily clamps velocity toward zero and biases **Heart** and **Witness**, yielding higher stability for harmonic outcomes.

### 5) Sampling for selection
At update:  
`score(g) = cos( vCycle, vec(g) ) = (v·g) / (||v||·||g||)`  
Pick argmax across available glyphs (or slots). Tie‑break by UX rules (e.g., prefer stability).

---

## 🧪 Algorithm (update loop)

```ts
function updateVessel(dt: number, breath, effects: GestureEffect[]) {
  // 1) update speed & direction
  let speed = cfg.speedBase;
  if (effects.includes("spiralBoost")) speed += cfg.speedGainSpiral;
  if (effects.includes("zigFlip")) state.dir *= -1;
  if (effects.includes("heartHold") && cfg.pauseOnHold) speed *= 0.15;

  // 2) integrate phase & compute vCycle
  state.t = (state.t + dt * speed * state.dir) % 1;
  const vBreath = mapBreathToVec7(breath);     // inhale/pause/exhale weights
  let v = mixVec7(cfg.cycleBias ?? neutralVec7(), vBreath, 0.5);
  if (cfg.jitterAmp) v = addJitterOnScale(v, cfg.jitterAmp, state.t);

  // 3) select glyph
  state.selectedGlyphId = argmaxGlyphCosine(v, GLYPHS);
  state.vCycle = v;
}
```

---

## 🪄 States & Gestures

- **idle** — breath‑pulse scale/opacity via `breathAnim`.  
- **hover/armed** — bloom +10%, shows drag handle.  
- **dragging** — decoupled from slot, soft motion trail.  
- **offered** — snapped to chest locus (BeingAura), fades into aura.  
- **echo** — small mirror in WitnessRadar (non‑interactive).

**Gesture effects** (from GestureEngine):  
`spiralBoost`, `zigFlip`, `heartHold`, `circleSeal` (later).

---

## 🎨 Rendering

- **SVG** for crisp glyph strokes in Vessel.  
- **Breath transform**: `scale`, `opacity` from `breathAnim`.  
- **Selection feedback**: rim highlight for selected glyph; cadence dots indicate speed/direction.  
- **7D hint (optional)**: tiny 7‑spoke “rose” indicating vCycle projection; spokes brighten with component magnitude.

---

## 📡 Events

- `vessel:cycle` (vCycle, selectedGlyphId)
- `vessel:dragStart|dragMove|dragEnd`
- `vessel:offer(glyphId, dropPoint)`
- `vessel:snapBack`

These are consumed by **CardChamber**, **BeingAura**, **WitnessRadar**, **Dialogue**.

---

## 🧰 Testing Notes

- Deterministic mode (fixed breath, no jitter) for golden image tests.  
- Force‑select glyph by seeding `vCycle` toward its vector; verify argmax.  
- Gesture replay fixtures → ensure consistent speed/reversal/hold behavior.  
- Edge: rapid zigzag spam should debounce `dir` flip (min 120 ms).

---

## 🔗 Related
- [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)
- *(Planned)* GestureEngine.md, CoherenceEngine.md, BeingAura.md
