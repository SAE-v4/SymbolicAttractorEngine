// px <-> normalized (minDim) helpers

export interface Viewport { w: number; h: number; min: number; }

export function getViewport(canvas: HTMLCanvasElement): Viewport {
  const w = canvas.width, h = canvas.height, min = Math.min(w, h);
  return { w, h, min };
}

// normalized (origin center, 1 unit == minDim)
export function polarToNorm(r:number, theta:number): [number, number] {
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

// normalized -> pixels (canvas coords)
export function normToPx(x:number, y:number, vp:Viewport): [number, number] {
  const cx = vp.w * 0.5 + x * vp.min;
  const cy = vp.h * 0.5 - y * vp.min;
  return [cx, cy];
}
