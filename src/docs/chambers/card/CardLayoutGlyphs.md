# Card Layout Chamber — Glyphs

## 🌟 What is a Glyph?

In this build, a **glyph** is a *playable symbolic unit* with:

- **Identity**: `id`, `label`
- **Form**: SVG symbol or procedural geometry
- **Meaning vector**: a 7D placement in the symbolic field
- **Interactions**: what gestures/uses it supports
- **States & animations**: idle, held, offered, echo
- **Optional text alias**: for seed phrases, not for UI chrome

---

## 🔖 Types of Glyphs

1. **Core Symbols**
   - Example: ❤️ heart, 🌀 spiral, 🔥 flame
   - Have SVG/procedural forms + 7D vector
   - Manipulated in the **Focus Vessel** and by offering

2. **Gestural Glyphs**
   - Example: spiral, zigzag, heart-hold
   - Bound to gestures (trace, swipe, hold)
   - May overlap with core symbols (spiral is both)
   - Semantic vector optional; primary job = cycle modulation

3. **Diagram Glyphs**
   - Example: harmonic-cross, aura-radar, crown-corona
   - Procedural composites (lines, arcs, rings)
   - Express chamber state; not draggable

4. **Lexical Tokens (not glyphs)**
   - Words like *leaf*, *gift*, *breath*
   - Tokens appear in seed phrases or flows
   - No SVG, no drag, no focus-vessel role

---

## 🎮 Vertical Slice Trio

Minimal set for first slice:
- **spiral** — accelerates/rotates cycle
- **zigzag** — reverses cycle
- **heart** — tap/hold → stabilizes coherence

(🔥 flame and 👁 witness can be added later without refactor.)

---

## 🧮 Data Shape (TypeScript)

```ts
export type GlyphId =
  | "heart" | "spiral" | "zigzag"
  | "flame" | "witness" | "sun" | "moon" | "seal"
  | "harmonic-cross" | "aura-radar" | "crown-corona";

export type BreathPhase = "inhale" | "pause" | "exhale";

// 7D vector: [Light, Warmth, Heart, Flame, Inhale, Scale, Witness]
export type Vec7 = [number, number, number, number, number, number, number];

export interface GlyphSpec {
  id: GlyphId;
  label: string;
  kind: "core" | "gesture" | "diagram";
  svg?: string;               // symbol reference
  procedural?: "spiral"|"radar"|"cross"|"corona";
  vec?: Vec7;
  gestures?: Array<"trace-spiral"|"trace-zigzag"|"tap-hold"|"circle-seal">;
  offerable?: boolean;
  colorKey: "light"|"shadow"|"warmth"|"coolness"|"heart"|"spirit"|"flame"|"offering"|"witness";
  breathAnim: {
    scale: [number, number];
    opacity: [number, number];
  };
  audio: {
    gesture?: string;
    offer?: string;
    receive?: string;
    harmonic?: string;
  };
}
```

---

## 📑 Example Specs

```ts
export const GLYPHS: Record<GlyphId, GlyphSpec> = {
  heart: {
    id:"heart", label:"Heart", kind:"core",
    svg:"#g-heart",
    vec:[+0.2,+0.1,+0.9,+0.1,+0.3,0.0,+0.4],
    gestures:["tap-hold"],
    offerable:true,
    colorKey:"heart",
    breathAnim:{ scale:[0.95,1.08], opacity:[0.85,1.0] },
    audio:{ gesture:"heart-pulse", offer:"offer-chime", receive:"rose-chord", harmonic:"gold-bell" }
  },
  spiral: {
    id:"spiral", label:"Spiral", kind:"gesture",
    svg:"#g-spiral",
    vec:[0.0,+0.2,+0.2,0.0,0.0,+0.4,+0.1],
    gestures:["trace-spiral"],
    offerable:true,
    colorKey:"spirit",
    breathAnim:{ scale:[0.92,1.06], opacity:[0.8,1.0] },
    audio:{ gesture:"harp-arpeggio", offer:"offer-chime", receive:"violet-cluster", harmonic:"rainbow-bell" }
  },
  zigzag: {
    id:"zigzag", label:"Zigzag", kind:"gesture",
    svg:"#g-zigzag",
    vec:[0.0,0.0,-0.2,+0.3,0.0,-0.3,-0.2],
    gestures:["trace-zigzag"],
    offerable:true,
    colorKey:"shadow",
    breathAnim:{ scale:[0.96,1.03], opacity:[0.75,0.95] },
    audio:{ gesture:"string-scratch", offer:"offer-pluck", receive:"minor-glint", harmonic:"deep-bell" }
  }
};
```

---

## 🎨 Rendering

- **SVG glyphs**: defined in `<defs>` sprite sheet, instantiated via `<use href="#g-id">`.  
- **Procedural diagrams**: radar rings, harmonic cross, crown rays drawn via Canvas2D or runtime SVG path.  
- **Breath animation**: `applyBreathAnim(spec.breathAnim, phase, value)` drives scale/opacity.  
- **Palette hook**: `withBreathPhase(colorKey, phase)` nudges brightness/chroma.  

---

## 🔄 Interaction Mapping

- **Focus Vessel**: shows one glyph at a time, breath‑pulsed.  
- **Gestures**:  
  - trace‑spiral → accelerate cycle, shimmer aura‑radar  
  - trace‑zigzag → reverse cycle, arcs kink  
  - tap‑hold heart → freeze glyph, chest glow  

- **Offering**: drag → chest slot → coherence resolution → triggers:  
  - diagram glyphs (harmonic‑cross flash, radar ripple)  
  - seed phrase overlay  

---

## 🎭 States

- **idle** — breath‑pulse (scale/opacity).  
- **hover/armed** — bloom +10%.  
- **dragging** — detached with soft trail.  
- **offered** — snaps to chest, fades into aura.  
- **echo** — small reflection in witness arcs (not pickable).  

---

## 🎨 Palette & 🎼 Audio

- `colorKey` → Palette resolves stroke/fill.  
- Same key drives chamber accents (cohesion).  
- Audio hooks: `gesture`, `offer`, `receive`, `harmonic`.  

---

## 📝 Tokens vs Glyphs

- **Glyphs** = playable, draggable, animated symbols.  
- **Tokens** = lexical words. Appear in phrases, not offered.  
