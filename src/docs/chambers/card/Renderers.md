# Renderers — Card Chamber

📍 Location: `src/docs/chambers/card/Renderers.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

This document defines the **rendering contracts** used by the Card chamber:
- **SvgSprite** — inline `<defs>` sprite sheet of glyph symbols.
- **SvgGlyph** — declarative SVG usage with breath/gesture transforms.
- **CanvasRadar** — rings, ripples, and echo placement for WitnessRadar.
- **CanvasBackground** — optional gradient / shader bridge (future GL).
- **HarmonicCross** (proc‑lines) — event flare for BeingAura.
- **TextOverlay** — baseline text renderer used by SeedPhraseOverlay.

These are designed to be **engine‑agnostic**, composable, and DPI‑safe.

---

## 🧱 Common Principles

- **DPR‑safe**: scale canvas by `devicePixelRatio`; snap strokes to device pixels.
- **Stateless core + thin state**: rendering functions are pure; state lives in components/systems.
- **Breath‑aware**: transforms accept `{ phase, value, velocity }` (0..1).
- **Palette‑aware**: accept resolved colors (string or RGBA) from `Palette`.
- **Compositing**: prefer `source-over`; use `screen`/`lighter` sparingly for glows.
- **Performance**: batch paths; reuse gradients; memoize symbol measurements.

---

## 🧩 SvgSprite

Inline symbol defs injected once (per shadow root).

**Contract**
```ts
export interface SpriteSymbol {
  id: string;              // "#g-heart"
  viewBox: string;         // "0 0 100 100"
  paths: string[];         // SVG path data
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}

export interface SvgSprite {
  mount(root: ShadowRoot): void;
  has(id: string): boolean;
  add(sym: SpriteSymbol): void;     // for runtime additions if needed
}
```

**Notes**
- Keep stroke widths **proportional** (use `vector-effect: non-scaling-stroke` when scaling).
- Symbols: `g-heart`, `g-spiral`, `g-zigzag`, (later `g-witness`, `g-flame`).

---

## 🧩 SvgGlyph

Declarative `<use>` (or `<path>`) wrapper with breath & gesture transforms.

**Contract**
```ts
export interface GlyphDrawOpts {
  href: string;                 // "#g-heart"
  x: number; y: number;
  size: number;                 // reference size (viewBox normalized)
  rotation?: number;            // radians
  opacity?: number;             // 0..1
  scale?: number;               // 1.0 default
  color?: string;               // resolved via Palette
  strokeWidth?: number;         // device-independent
  ariaLabel?: string;           // accessibility label
}

export interface SvgGlyphRenderer {
  draw(svgRoot: SVGSVGElement, opts: GlyphDrawOpts): SVGElement;
  update(el: SVGElement, opts: Partial<GlyphDrawOpts>): void;
}
```

**Breath mapping**
- `scale = lerp(anim.scale[0], anim.scale[1], f(breath))`
- `opacity = lerp(anim.opacity[0], anim.opacity[1], f(breath))`

**Accessibility**
- Set `role="img"` and `aria-label` if the glyph is meaningful (e.g., Heart).

---

## 🧩 CanvasRadar

Canvas2D routines for rings, phase band, ripples, and echo anchors.

**Contract**
```ts
export interface RadarStyle {
  ringColor: string;
  ringAlpha: number;
  bandColor: string;
  rippleColor: string;
}

export interface RadarSnapshot {
  center: { x:number; y:number };
  ringCount: number;
  ringSpacing: number;
  phaseIndex: number;        // which ring is the phase band
  drift: number;             // px inward/outward offset from breath
  ripples: Array<{ r:number; alpha:number }>;
  echoes: Array<{ x:number; y:number; alpha:number }>; // anchor points
}

export function drawRadar(g: CanvasRenderingContext2D, snap: RadarSnapshot, style: RadarStyle): void;
```

**Implementation hints**
- Pixel snap: `g.translate(0.5, 0.5)` when drawing 1px strokes.
- Precompute ring radii: `r_i = r0 + i*ringSpacing + drift`.
- Draw phase band as a thicker stroke or double stroke with blend.

---

## 🧩 CanvasBackground (optional)

Simple gradient wash, with a **GL bridge** later.

**Contract**
```ts
export interface BackgroundParams {
  width: number;
  height: number;
  t: number;                  // 0..1 phase along day/cycle
  top: string;                // CSS color
  bottom: string;
}

export function drawBackground(g: CanvasRenderingContext2D, p: BackgroundParams): void;
```

**Notes**
- Keep subtle; the card UI is the focus.
- Future: a `WebGL` variant exposed behind the same interface.

---

## 🧩 HarmonicCross (procedural lines)

Flare for harmonic outcomes at the chest locus.

**Contract**
```ts
export interface CrossParams {
  x:number; y:number;
  length:number;              // base length
  thickness:number;           // base line width
  intensity:number;           // 0..1 mapped from score
  color:string;
}

export function drawHarmonicCross(g: CanvasRenderingContext2D, p: CrossParams): void;
```

**Visual recipe**
- Two orthogonal lines; width scales with `intensity` (clamped).
- Small chroma lift via `Palette` on harmonic.
- Fade on a short envelope (≈ 300–600ms).

---

## 🧩 TextOverlay (SeedPhraseOverlay baseline)

Minimal, engine-agnostic text draw for ephemeral phrases.

**Contract**
```ts
export interface TextStyle {
  font: string;             // "400 16px system-ui"
  color: string;
  align: CanvasTextAlign;   // "center", "left", etc.
  baseline: CanvasTextBaseline;
  shadowColor?: string;
  shadowBlur?: number;
}

export function drawText(g: CanvasRenderingContext2D, text: string, x:number, y:number, style: TextStyle, opacity=1): void;
```

**Notes**
- Avoid layout jitter: measure once, reuse.
- For arc text, precompute path points and draw letter-by-letter (optional extension).

---

## 🧮 DPI / Resize Strategy

For each canvas:
```ts
function resizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  const g = canvas.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);  // scale to CSS pixels
  return g;
}
```

- Recompute cached gradients when size changes.
- Throttle resizes (RAF or `requestIdleCallback`).

---

## 🧵 Layering & Z‑order

Recommended order inside the card:
1. **CanvasBackground**  
2. **BeingAura** (canvas)  
3. **WitnessRadar** (canvas)  
4. **FocusVessel** (SVG)  
5. **SeedPhraseOverlay** (DOM/canvas)  
6. **LoreArchiveView** (DOM)

Keep **interactive** elements (FocusVessel) in SVG/DOM for crisp hit‑testing.

---

## 🧪 Testing

- Golden renders: deterministic breath + fixed RNG seed.  
- Raster diffing (±1 px tolerance) to detect regressions.  
- Performance budget: 60 FPS on iPhone‑class devices with 3 rings and one ripple.  
- Accessibility: ensure glyphs with semantic meaning provide `aria-label`.

---

## 🔗 Related

- [CardLayoutChamber.md](./CardLayoutChamber.md)  
- [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)  
- [WitnessRadar.md](./WitnessRadar.md)  
- [BeingAura.md](./BeingAura.md)  
- [SeedPhraseOverlay.md](./SeedPhraseOverlay.md)

---
