// px <-> normalized (minDim) helpers

export type Viewport = {
  w: number; h: number;
  cx: number; cy: number;
  min: number; max: number;
};

/** Use CSS pixel sizes so it matches a DPR-scaled 2D context. */
export function getViewport(canvas: HTMLCanvasElement): Viewport {
  const w = canvas.clientWidth | 0;
  const h = canvas.clientHeight | 0;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const min = Math.min(w, h);
  const max = Math.max(w, h);
  return { w, h, cx, cy, min, max };
}

/** Map normalized min-dim space → CSS px (origin at center). */
export function normToPx(nx: number, ny: number, vp: Viewport): [number, number] {
  return [vp.cx + nx * vp.min, vp.cy + ny * vp.min];
}


// normalized (origin center, 1 unit == minDim)
export function polarToNorm(r:number, theta:number): [number, number] {
  return [r * Math.cos(theta), r * Math.sin(theta)];
}