# Palette — Card Chamber

📍 Location: `src/docs/chambers/card/Palette.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

The **Palette** provides cohesive color keys across layers (background, aura, radar, glyphs, text) and exposes **breath‑aware** modulation helpers.  
It is engine‑agnostic and returns CSS color strings (or RGBA tuples) ready for Canvas/SVG/DOM.

---

## 🎨 Color Model

Prefer **OKLCH** for perceptual consistency; fall back to HSL if needed.  
Each color key stores a base color and optional tone variants. The API returns resolved strings and small, reversible adjustments for breath and state.

**Axis keys** (semantic):  
`light, shadow, warmth, coolness, heart, spirit, flame, offering, witness`

**Usage keys** (UI layers):  
`bg, walls, aura, vessel, text, accent`

---

## 🔢 Types (TypeScript)

```ts
export type ColorKey =
  | "light" | "shadow" | "warmth" | "coolness"
  | "heart" | "spirit" | "flame" | "offering" | "witness";

export interface Oklch {
  l: number;   // 0..1
  c: number;   // 0..0.37 typical
  h: number;   // 0..360
}

export interface PaletteEntry {
  base: Oklch;
  text: Oklch;        // preferred readable text color on base
  weak?: Oklch;       // subtle variant (rings, hints)
  strong?: Oklch;     // accent variant (events)
}

export interface PaletteTheme {
  id: string;
  entries: Record<ColorKey, PaletteEntry>;
  bg: Oklch;          // background wash
  walls: Oklch;       // default radar ring color
}

export interface ResolvedColor {
  css: string;        // e.g., "oklch(0.82 0.08 25)"
  rgba: [number,number,number,number];
}

export interface PaletteAPI {
  get(key: ColorKey, role?: "base"|"weak"|"strong"|"text"): ResolvedColor;
  toCss(c: Oklch, alpha?: number): string;
  withBreathPhase(key: ColorKey, phase: BreathPhase, value: number): ResolvedColor;
  mix(a: Oklch, b: Oklch, t: number): Oklch;
  lighten(c: Oklch, dl: number): Oklch;
  saturate(c: Oklch, dc: number): Oklch;
}
```

---

## 🧭 Suggested Mappings

**ColorKey → layer defaults**  
- `heart` → BeingAura halo + Heart glyph  
- `spirit` → Spiral glyph + vessel rim  
- `shadow` → Zigzag glyph + subtle walls tint  
- `witness` → Radar rings & echoes  
- `flame` → Event accents (offer/receive)  
- `offering` → Drag ghost/trace

**Fallback text**  
- Choose `entry.text` with WCAG AA contrast ≥ 4.5:1 against `entry.base`.

---

## 🌬 Breath Modulation

Breath phases apply small, reversible deltas:

- **Inhale** → lighten `+Δl`, desaturate `−Δc` (quiet glow).  
- **Exhale** → darken `−Δl`, saturate `+Δc` (warm release).  
- **Pause**  → keep `l` steady, add slight hue drift toward `witness` key.

Suggested deltas (tuned empirically):  
```
Δl_inhale = +0.03..0.06,  Δc_inhale = -0.02..-0.04
Δl_exhale = -0.02..-0.05, Δc_exhale = +0.02..+0.05
Δh_pause  =  +3..+8 degrees toward witness hue
```

**API behavior**  
`withBreathPhase(key, phase, value)` returns a color whose `(l,c,h)` were adjusted by `value ∈ [0..1]` using the above deltas.

---

## 🧪 Theme Example (seed)

```ts
export const CARD_THEME: PaletteTheme = {
  id: "card-default",
  entries: {
    light:   { base:{l:0.90,c:0.06,h:100}, text:{l:0.18,c:0.03,h:260} },
    shadow:  { base:{l:0.20,c:0.04,h:260}, text:{l:0.88,c:0.03,h:100} },
    warmth:  { base:{l:0.78,c:0.11,h:55},  text:{l:0.18,c:0.03,h:260} },
    coolness:{ base:{l:0.78,c:0.08,h:220}, text:{l:0.18,c:0.03,h:260} },
    heart:   { base:{l:0.70,c:0.20,h:25},  text:{l:0.12,c:0.03,h:260} },
    spirit:  { base:{l:0.72,c:0.14,h:280}, text:{l:0.12,c:0.03,h:260} },
    flame:   { base:{l:0.68,c:0.23,h:35},  text:{l:0.10,c:0.02,h:260} },
    offering:{ base:{l:0.82,c:0.07,h:95},  text:{l:0.18,c:0.03,h:260} },
    witness: { base:{l:0.84,c:0.05,h:240}, text:{l:0.18,c:0.03,h:260} }
  },
  bg:    { l:0.93,c:0.02,h:100 },
  walls: { l:0.80,c:0.04,h:240 }
};
```

---

## 🧼 Accessibility Notes

- Ensure **text** and **thin lines** pass AA contrast over dynamic backgrounds.  
- When `withBreathPhase` reduces contrast, clamp deltas or switch to `entry.text`.  
- High‑motion themes: avoid simultaneous strong chroma + opacity modulation.

---

## 🔗 Related

- [Renderers.md](./Renderers.md)  
- [SeedPhraseOverlay.md](./SeedPhraseOverlay.md)  
- [BeingAura.md](./BeingAura.md)  
- [WitnessRadar.md](./WitnessRadar.md)  
- *(Next)* [BreathBindings.md](./BreathBindings.md)

---
