# BreathBindings — Card Chamber

📍 Location: `src/docs/chambers/card/BreathBindings.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

**BreathBindings** maps **BreathRuntime** signals (phase, value, velocity, bpm) to animation channels for Canvas/SVG/Audio and to **Palette** modulation.  
It defines a small set of reusable curves to keep the chamber coherent and tunable.

---

## 🫁 Breath Signals

From the runtime:
```ts
export interface Breath {
  phase: "inhale" | "pause" | "exhale";
  value: number;       // 0..1 within phase
  velocity: number;    // signed; + during inhale, - during exhale
  bpm: number;         // breaths per minute
  tGlobal: number;     // running time
}
```

---

## 🔧 Binding Channels

- **geom.scale**: scalar multiplier for size (glyphs, halo).  
- **geom.opacity**: 0..1 opacity factor.  
- **geom.rotation**: radians; subtle for spiral hints.  
- **color**: call `Palette.withBreathPhase`.  
- **audio.env**: ADSR‑like envelope synced to phase.

---

## 📈 Curves

Define a canonical easing per channel; other components consume via helpers.

```ts
export interface BindingSet {
  scale:   (b: Breath) => number;
  opacity: (b: Breath) => number;
  rotate?: (b: Breath) => number;
  audio?:  (b: Breath) => { gain:number; cutoff?:number };
}

export const DefaultBindings: BindingSet = {
  scale:   b => 0.97 + 0.06 * phaseEase(b),        // inhale ↑, exhale ↓
  opacity: b => 0.80 + 0.20 * phaseEase(b),        // keep readable at rest
  rotate:  b => (b.phase === "inhale" ? +1 : -1) * 0.03 * b.value, // tiny drift
  audio:   b => ({ gain: 0.4 + 0.25 * phaseEase(b) })
};
```

Where
```ts
function phaseEase(b: Breath) {
  const t = b.value;
  switch (b.phase) {
    case "inhale": return Math.pow(t, 0.75);
    case "exhale": return 1 - Math.pow(t, 0.85);
    case "pause":  return 0.65; // steady plateau
  }
}
```

---

## 🔗 Usage Patterns

- **Glyphs (SvgGlyph)**  
  `scale = lerp(spec.breathAnim.scale, DefaultBindings.scale(b))`  
  `opacity = lerp(spec.breathAnim.opacity, DefaultBindings.opacity(b))`

- **BeingAura**  
  Map halo radius to `scale`; crown chroma to `Palette.withBreathPhase(heart, …)`.

- **WitnessRadar**  
  Use `scale/opacity` to drift rings 1–2 px; phase band brightness from opacity.

- **Background**  
  Optional slow `t` modulation (`bpm`→ day fraction).

- **Audio**  
  Feed `DefaultBindings.audio(b).gain` to the drone pad; use `velocity` as cutoff hint.

---

## 🧪 Testing

- Fixed breath loop → check smoothness and end‑of‑phase continuity.  
- BPM sweep 4..9 → ensure no clipping of envelopes.  
- Pause duration stress → verify plateau stability (no flicker).

---

## 🔗 Related

- [Palette.md](./Palette.md)  
- [Renderers.md](./Renderers.md)  
- [FocusVessel.md](./FocusVessel.md)  
- [BeingAura.md](./BeingAura.md)  
- [WitnessRadar.md](./WitnessRadar.md)

---
