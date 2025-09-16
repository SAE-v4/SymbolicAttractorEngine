# WitnessRadar — Card Chamber

📍 Location: `src/docs/chambers/card/WitnessRadar.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

**WitnessRadar** visualises **coherence** and **stillness** as concentric arcs/rings in the walls layer.  
It breathes with the chamber, nods to **gesture events**, and inscribes **echo glyphs** / brief words along arcs when outcomes occur.

---

## 🧠 Conceptual Model

- **Rings** contract/expand with breath (see Witness axis).  
- **Ripples** propagate outward on accept/harmonic.  
- **Echoes**: tiny glyphs placed at ring angles that correspond to contributing axes.  
- Optionally **inscribes** one or two words (from Dialogue) along an arc.

---

## 🔩 Structure

```
WitnessRadar
├─ Base rings (N)
├─ Phase band (thicker ring for current breath)
├─ Ripples (spawned on events)
└─ Echo inscriptions
   ├─ glyph echoes (SvgGlyph)
   └─ token text (small, curved)
```

---

## 🔢 Types (TypeScript)

```ts
export interface RadarConfig {
  ringCount: number;            // 4..8
  ringSpacing: number;          // px between rings
  rippleCountMax: number;       // cap
  echoSize: number;             // px
}

export interface Ripple {
  t0: number;                   // spawn time
  life: number;                 // ms
  r0: number;                   // start radius
  v: number;                    // px/s
  alpha: number;
}

export interface Echo {
  glyphId?: GlyphId;
  text?: string;
  ringIndex: number;
  angle: number;                // radians
  life: number;                 // ms
}

export interface WitnessRadarIO {
  applyBreath(b: { phase: BreathPhase; value: number }): void;
  ripple(outcome: { kind: OutcomeKind; score: number; accents?: Partial<Vec7> }): void;
  echoGlyph(glyphId: GlyphId, axes?: number[]): void;
  echoText(text: string, axisHint?: number): void;
  render(g: CanvasRenderingContext2D): void; // Canvas2D recommended
}
```

---

## 🌬 Breath Bindings

- **Inhale**: rings drift inward 1–2 px; phase band brightens.  
- **Exhale**: rings drift outward; phase band softens.  
- **Pause**: suppress drift; boost **Witness/Scale** tint.

Recommended alpha: `α = α0 + αg * breath.value`; small hue sway with palette.

---

## 🔄 Ripples

Spawned on **accept** / **harmonic**:  
- Set `r0` to current phase band radius.  
- Velocity `v` scales with score (harmonic faster / brighter).  
- Life 800–1400 ms; alpha fades with quadratic ease.  
- Multiple ripples may overlap; clamp by `rippleCountMax`.

---

## 🔁 Echoes

**Glyph echoes**  
- Place at ring index derived from contributing axis.  
- Angle seeded by vessel cycle `t` to feel connected.  
- Use `SvgGlyph` overlays (tiny, non‑interactive).

**Text echoes**  
- Short (≤2 words).  
- Curve along arc; keep size small (10–12 px).  
- Fade with ring alpha to avoid clutter.

---

## 🎨 Rendering Notes

- **Canvas2D** for rings & ripples (efficient strokes).  
- Snap pixel radius to reduce shimmer.  
- Composite: use `lighter` or `screen` sparingly for glows.  
- Respect palette: walls layer uses cooler keys unless accenting Heart/Flame.

---

## 📡 Events

- `radar:ripple(kind, score)`  
- `radar:echo(glyphId|text)`  
- `radar:clear()` (when scene resets)

---

## 🧪 Testing

- Breath sweep test: ensure ring drift is stable at various DPIs.  
- Ripple overlap & cap behavior under rapid offers.  
- Echo placement reproducibility with fixed seeds.

---

## 🔗 Related

- [BeingAura.md](./BeingAura.md)  
- [DialogueSystem.md](./DialogueSystem.md)  
- [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)

---
