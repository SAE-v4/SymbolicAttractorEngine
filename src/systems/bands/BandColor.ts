// src/systems/bands/BandColor.ts
import type { Oklch } from "./BandTypes";

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const wrap = (h: number) => ((h % 360) + 360) % 360;
export const lerpHue = (a: number, b: number, t: number) => {
  const A = wrap(a), B = wrap(b);
  const d = wrap(B - A + 180) - 180;
  return wrap(A + d * t);
};

export const lerpOKLCH = (a: Oklch, b: Oklch, t: number): Oklch => ({
  l: lerp(a.l, b.l, t),
  c: lerp(a.c, b.c, t),
  h: lerpHue(a.h, b.h, t),
});

export const cssOKLCH = ({ l, c, h }: Oklch) =>
  `oklch(${(l * 100).toFixed(3)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
