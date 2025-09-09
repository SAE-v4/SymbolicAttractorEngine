// src/renderers/beacons.ts
import { PAL } from "@/config/palette";

export function drawBeaconDot(
  g: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  label: "heart"|"dreamer"|"mirror",
  inhale01: number,
  pal: ReturnType<typeof PAL>
){
  const base = { heart: 1.0, dreamer: 0.75, mirror: 0.75 }[label];
  const a = (label === "heart")
    ? 0.25 + 0.55 * inhale01  // heart brightens on inhale
    : 0.18 + 0.22 * inhale01;
  const rad = r * 0.06 * base;

  g.save();
  g.globalCompositeOperation = "lighter";
  g.shadowColor = pal.css("ring", 0.9);
  g.shadowBlur  = 12;
  g.fillStyle   = pal.css("spark", a);
  g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI*2); g.fill();
  g.restore();
}
