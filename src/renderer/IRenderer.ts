export type Color = string;

export interface IRenderer {
  // life-cycle
  resize(widthPx: number, heightPx: number): void;
  beginFrame(): void;
  endFrame(): void;
  clear(color?: Color): void;

  // state
  setAlpha(a: number): void;
  setStroke(color: Color, widthPx: number, dash?: number[]): void;
  setFill(color: Color): void;

  // NDC helpers (0..1 coords, renderer maps to pixels)
  lineNDC(x1: number, y1: number, x2: number, y2: number): void;
  circleNDC(x: number, y: number, rNdc: number, fill?: boolean): void;

  // simple path in NDC
  pathMoveNDC(x: number, y: number): void;
  pathLineNDC(x: number, y: number): void;
  pathStroke(): void;
}
