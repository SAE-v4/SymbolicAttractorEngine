// 2D-ctx scene painter: ribbon, knots, traveler glyph
import { getViewport, normToPx } from "@utils/coords";
import type { Knot, SpiralConfig } from "./types";

export class SceneCanvas {
  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {}

  clear() {
    // ctx is scaled to DPR, so draw/clear in CSS pixels:
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
  }

  drawSpiral(
    cfg: SpiralConfig,
    knots: Knot[],
    spiralScale: number,
    ribbonWidth: number
  ) {
    const ctx = this.ctx;
    const vp = getViewport(this.canvas);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter";

    const widths = [1.0, 1.6, 2.2].map((f) => ribbonWidth * f * vp.min * 0.004);
    const alphas = [0.9, 0.35, 0.15];

    for (let pass = 0; pass < widths.length; pass++) {
      ctx.beginPath();
      knots.forEach((k, i) => {
        const x = k.pos[0] * spiralScale,
          y = k.pos[1] * spiralScale;
        const [px, py] = normToPx(x, y, vp);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.strokeStyle = `rgba(170, 200, 255, ${alphas[pass]})`;
      ctx.lineWidth = widths[pass];
      ctx.stroke();
    }
    ctx.restore();
  }

  // Peristaltic ribbon: width/alpha vary along arc-length with a traveling wave.
// pts: normalized coords [ [x,y], ... ] in min-dim space (origin center)
// baseWidth: your breath-driven width scalar (same as before)
// wave: controls + state
drawRibbonPeristaltic(
  pts: [number, number][],
  baseWidth: number,
  wave: {
    time: number;            // seconds (accumulate in the system)
    breath01: number;        // 0..1
    breathSS: number;        // signed slow: -1..+1
    amp?: number;            // wave amplitude (0..1), default 0.10
    lambda?: number;         // fraction of path per wave (0..1), default 0.25
    freq?: number;           // Hz, default 0.25
    widthGain?: number;      // how much width modulates, default 0.14
    alphaGain?: number;      // how much alpha modulates, default 0.10
    segmentStride?: number;  // draw every Nth segment for perf, default 1
  }
) {
  const ctx = this.ctx; const vp = getViewport(this.canvas);
  if (pts.length < 2) return;

  const {
    time, breath01, breathSS,
    amp = 0.10, lambda = 0.25, freq = 0.25,
    widthGain = 0.14, alphaGain = 0.10,
    segmentStride = 1,
  } = wave;

  // Precompute cumulative arc-length s in [0..1]
  const s: number[] = new Array(pts.length).fill(0);
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    total += Math.hypot(bx - ax, by - ay);
    s[i] = total;
  }
  if (total > 0) for (let i = 0; i < s.length; i++) s[i] /= total;

  // Traveling wave; direction reverses with breathSS sign
  const sign = breathSS >= 0 ? +1 : -1;
  const twoPi = Math.PI * 2;
  // Slightly breathe the amplitude with inhale; keep it subtle
  const A = amp * (0.75 + 0.25 * breath01);

  // Three soft passes (inner bright + two wider, softer), like before
  const baseWidths = [1.0, 1.7, 2.6].map(f => baseWidth * f * vp.min * 0.0045);
  const baseAlphas = [0.95, 0.40, 0.18];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';

  // Draw small segments so we can vary lineWidth/alpha locally
  for (let pass = 0; pass < 3; pass++) {
    const width0 = Math.max(1, baseWidths[pass]);
    const alpha0 = baseAlphas[pass];

    ctx.beginPath(); // we’ll stroke per mini-segment; path resets per segment

    for (let i = 0; i < pts.length - 1; i += segmentStride) {
      const i2 = Math.min(i + segmentStride, pts.length - 1);

      // Midpoint s for this segment
      const smid = 0.5 * (s[i] + s[i2]);

      // Wave field (−1..+1)
      const phase = twoPi * (smid / Math.max(1e-6, lambda) - sign * freq * time);
      const w = Math.sin(phase);

      // Local width & alpha factors
      const wMod = 1 + widthGain * A * w;
      const aMod = 1 + alphaGain * A * w;
      const width = Math.max(1, width0 * wMod);
      const alpha = Math.max(0.04, Math.min(1, alpha0 * aMod));

      // Draw this tiny segment with its own width/alpha
      const [ax, ay] = pts[i], [bx, by] = pts[i2];
      const [px1, py1] = normToPx(ax, ay, vp);
      const [px2, py2] = normToPx(bx, by, vp);

      ctx.strokeStyle = `rgba(170,200,255,${alpha})`; // color still controlled globally via grade/palette
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }
  }

  ctx.restore();
}


  drawSpiralPolyline(pts: [number, number][], ribbonWidth: number) {
    const ctx = this.ctx;
    const vp = getViewport(this.canvas);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter";

    const widths = [1.0, 1.7, 2.6].map(
      (f) => ribbonWidth * f * vp.min * 0.0045
    );
    const alphas = [0.95, 0.4, 0.18];

    for (let p = 0; p < widths.length; p++) {
      ctx.beginPath();
      pts.forEach(([nx, ny], i) => {
        const [px, py] = normToPx(nx, ny, vp);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.strokeStyle = `rgba(170, 200, 255, ${alphas[p]})`;
      ctx.lineWidth = Math.max(1, widths[p]);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawKnot(k: Knot, spiralScale: number, glow = 0.0) {
    const ctx = this.ctx;
    const vp = getViewport(this.canvas);
    const x = k.pos[0] * spiralScale,
      y = k.pos[1] * spiralScale;
    const [px, py] = normToPx(x, y, vp);
    const r = vp.min * 0.006;

    ctx.save();
    ctx.fillStyle = `rgba(230,245,255,${
      0.6 + 0.4 * Math.min(1, Math.max(0, glow))
    })`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(180,210,255,0.18)`;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawTraveler(
    pos: [number, number],
    spiralScale: number,
    phase01: number,
    angle = 0
  ) {
    const ctx = this.ctx;
    const vp = getViewport(this.canvas);
    const [px, py] = normToPx(pos[0] * spiralScale, pos[1] * spiralScale, vp);
    const r = vp.min * 0.012;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.9, 0, 0, r);
    ctx.quadraticCurveTo(-r * 0.9, 0, 0, -r);
    ctx.closePath();
    ctx.fillStyle = `rgba(230,245,255,0.85)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,0.35)`;
    ctx.lineWidth = r * 0.18;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    ctx.restore();
  }
}
