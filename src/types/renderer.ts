// src/types/renderer.ts

/**
 * Symbolic UI Renderer Contract
 * --------------------------------------------------------------------
 * This file defines the minimal contracts for rendering:
 *  - base glyphs (atomic icons)
 *  - phrase glyphs (compound seals)
 *  - diagram phrases (breathing, layered)
 *
 * It’s framework-agnostic: implement with Canvas2D, WebGL, SVG, or React.
 */

export type BreathPhaseName = "inhale" | "exhale" | "pause";

/** A normalized breath state at render time */
export interface BreathState {
  /** current phase */
  phase: BreathPhaseName;
  /** interpolation in [0..1] within the current phase */
  t: number;
  /** optional global tempo (breaths per minute) */
  bpm?: number;
}

/** Which chamber layer we’re painting to */
export type ChamberLayer = "sky" | "walls" | "ground";

/** World-to-pixel context (or logical units) */
export interface RenderViewport {
  width: number;   // pixels or logical units
  height: number;  // pixels or logical units
  devicePixelRatio?: number;
}

/** Theme / palette hinting (optional) */
export interface RenderTheme {
  bg: string;           // background color
  stroke: string;       // primary line color
  strokeAlt?: string;   // secondary line color
  glow?: string;        // aura/glow color
}

/** Rendering target abstraction.
 *  Implementors can wrap CanvasRenderingContext2D, WebGL, SVG, etc.
 */
export interface RenderTarget {
  // lifecycle
  save(): void;
  restore(): void;
  clear(color?: string): void;

  // transforms
  translate(x: number, y: number): void;
  scale(x: number, y?: number): void;
  rotate(rad: number): void;

  // drawing (minimal)
  setStrokeStyle(color: string, width: number, opacity?: number): void;
  setFillStyle(color: string, opacity?: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  circle(cx: number, cy: number, r: number, fill?: boolean): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, rotationRad?: number, fill?: boolean): void;
  polyline(points: Array<[number, number]>): void;
  path(d: string, fill?: boolean): void; // SVG-like path hint (optional)
  text(str: string, x: number, y: number, align?: CanvasTextAlign): void;
}

/** Data models imported from your JSON files */
export interface BaseGlyph {
  id: string;
  name: string;
  category:
    | "point" | "circle" | "spiral" | "line"
    | "triangle" | "heart" | "droplet" | "crescent" | "vesica";
  svg_hint: string;
  notes?: string;
}

export interface PhraseGlyphComponent {
  base_id: string;  // references BaseGlyph.id
  role: string;     // 'axis' | 'seed' | 'vessel' | etc.
  transform_hint?: string;
}

export interface PhraseGlyph {
  id: string;
  title: string;
  components: PhraseGlyphComponent[];
  layout: string;   // 'axis' | 'cluster' | 'spiral' | 'chalice_vertical' | ...
  breath_dynamic_hint?: string;
  tags?: string[];
}

export interface DiagramPhrase {
  id: string;
  phrase_glyph_id: string; // references PhraseGlyph.id
  geometry: string;        // human-readable description
  breath_dynamic: { inhale: string; exhale: string; pause: string; };
  layers: ChamberLayer[];
  seasonal_emphasis?: string[];
  interaction_notes?: string;
}

/** Aggregated data bundle the renderer consumes */
export interface SymbolicUIDataset {
  baseGlyphs: BaseGlyph[];
  phraseGlyphs: PhraseGlyph[];
  diagramPhrases: DiagramPhrase[];
}

/** A stateless renderer interface */
export interface SymbolicUIRenderer {
  /** Draw a base glyph (atomic) */
  renderBaseGlyph(
    target: RenderTarget,
    viewport: RenderViewport,
    glyphId: string,
    opts?: { center?: [number, number]; scale?: number; theme?: RenderTheme }
  ): void;

  /** Draw a phrase glyph (compound seal) */
  renderPhraseGlyph(
    target: RenderTarget,
    viewport: RenderViewport,
    phraseId: string,
    opts?: { center?: [number, number]; scale?: number; theme?: RenderTheme }
  ): void;

  /** Draw a diagram phrase on a specific chamber layer, modulated by breath */
  renderDiagram(
    target: RenderTarget,
    viewport: RenderViewport,
    diagramId: string,
    layer: ChamberLayer,
    breath: BreathState,
    opts?: { theme?: RenderTheme }
  ): void;
}

/** Factory contract: binds data + drawing strategies to a renderer */
export interface RendererFactory {
  create(dataset: SymbolicUIDataset): SymbolicUIRenderer;
}

/** Convenience helpers (optional) */
export function defaultTheme(): RenderTheme {
  return {
    bg: "#0b1320",
    stroke: "#f3c46b",
    strokeAlt: "#ffffff",
    glow: "rgba(243,196,107,0.35)"
  };
}