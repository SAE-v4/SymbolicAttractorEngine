// src/systems/parallaxCamera.ts
export type Cam = { zoom: number; ox: number; oy: number };

/** Breath -> camera. Inhale zooms slightly inward, with a subtle vertical drift. */
export function camFromBreath(inhale01: number): Cam {
  const zoom = 1 + 0.10 * inhale01;       // breathe-in ⇒ zoom-in
  const oy   = (inhale01 - 0.5) * 12;     // gentle vertical sway
  return { zoom, ox: 0, oy };
}

/** Apply a parallax transform for a given z-depth around (cx, cy). */
export function layerTransform(
  g: CanvasRenderingContext2D,
  cam: Cam,
  z: number,
  cx: number,
  cy: number
) {
  const s = Math.pow(cam.zoom, z);
  g.translate(cx + cam.ox, cy + cam.oy);
  g.scale(s, s);
  g.translate(-cx, -cy);
}
