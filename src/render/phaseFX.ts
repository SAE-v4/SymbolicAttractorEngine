// render/phaseFX.ts
import { getBreath, getDownbeat } from "@utils/breath";

export function drawPhaseFX(
  g: CanvasRenderingContext2D,
  phase: number,
  w: number,
  h: number
) {
  const breath = getBreath(phase);
  const down = getDownbeat(phase);

  g.save();
  g.globalCompositeOperation = "source-over";

  // --- background wash (breath tint) ---
  const base = 235 + Math.round(10 * breath);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, `rgb(${base},${base + 4},${base + 10})`);
  bg.addColorStop(1, `rgb(${base - 3},${base + 1},${base + 7})`);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  // --- horizontal luminous bands ---
  const bandGap = Math.max(60, h * 0.12);
  const bandThickness = (6 + h * 0.012) * (0.7 + 0.6 * breath);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = 0.15 + 0.45 * breath + 0.10 * down;

  for (let y = (h * 0.25) % bandGap; y < h; y += bandGap) {
    const grd = g.createLinearGradient(0, y - bandThickness, 0, y + bandThickness);
    grd.addColorStop(0, "rgba(160,190,255,0)");
    grd.addColorStop(0.5, "rgba(200,220,255,1)");
    grd.addColorStop(1, "rgba(160,190,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, y - bandThickness, w, bandThickness * 2);
  }

  g.restore();
}
