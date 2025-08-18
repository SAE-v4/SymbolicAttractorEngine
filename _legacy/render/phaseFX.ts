import { getBreath, getDownbeat } from "_legacy/utils/breath";
import { BREATH_TUNING as T } from "@config/breath";

export function drawPhaseFX(g: CanvasRenderingContext2D, phase: number, w: number, h: number) {
  const breath = getBreath(phase, { shape: T.shape, offset: T.offset });
  const down   = getDownbeat(phase, { beatWidth: T.beatWidth });

  g.save();
  // background wash (subtle)
  const base = 235 + Math.round(10 * breath);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, `rgb(${base},${base+4},${base+10})`);
  bg.addColorStop(1, `rgb(${base-3},${base+1},${base+7})`);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);

 // inside drawPhaseFX after background wash

const bandGap = Math.max(T.band.gapMinPx, h * T.band.gapRel);
const bandThickness = (T.band.thicknessBase + h * 0.012) * (1 - T.band.thicknessGain/2 + T.band.thicknessGain * breath);

// Colors: use mid-blue (lower luminance) for contrast on light BG
const coreRGB = { r: 180, g: 205, b: 255 };   // core line (lighter pass)
const bodyRGB = { r: 120, g: 160, b: 235 };   // body fill (source-over pass)

// -------- PASS 1: Base band shape (source-over) --------
g.save();
g.globalCompositeOperation = "source-over";
g.globalAlpha = Math.min(1, T.band.alphaBase + T.band.alphaGain * breath + T.band.alphaBeat * down);

for (let y = (h * 0.25) % bandGap; y < h; y += bandGap) {
  const grd = g.createLinearGradient(0, y - bandThickness, 0, y + bandThickness);
  grd.addColorStop(0.00, `rgba(${bodyRGB.r},${bodyRGB.g},${bodyRGB.b},0)`);
  grd.addColorStop(0.50, `rgba(${bodyRGB.r},${bodyRGB.g},${bodyRGB.b},1)`);  // visible body
  grd.addColorStop(1.00, `rgba(${bodyRGB.r},${bodyRGB.g},${bodyRGB.b},0)`);
  g.fillStyle = grd;
  g.fillRect(0, y - bandThickness, w, bandThickness * 2);
}
g.restore();

// -------- PASS 2: Thin luminous core (lighter) --------
g.save();
g.globalCompositeOperation = "lighter";
// keep additive thin & modest; it’s just a highlight
const coreThickness = Math.max(2, bandThickness * 0.25);
g.globalAlpha = 0.25 + 0.35 * breath; // small glow swing

for (let y = (h * 0.25) % bandGap; y < h; y += bandGap) {
  const grd = g.createLinearGradient(0, y - coreThickness, 0, y + coreThickness);
  grd.addColorStop(0.00, `rgba(${coreRGB.r},${coreRGB.g},${coreRGB.b},0)`);
  grd.addColorStop(0.50, `rgba(${coreRGB.r},${coreRGB.g},${coreRGB.b},1)`);  // bright core
  grd.addColorStop(1.00, `rgba(${coreRGB.r},${coreRGB.g},${coreRGB.b},0)`);
  g.fillStyle = grd;
  g.fillRect(0, y - coreThickness, w, coreThickness * 2);
}
g.restore();
}
