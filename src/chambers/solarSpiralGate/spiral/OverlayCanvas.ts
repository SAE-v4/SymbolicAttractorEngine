// 2D-ctx overlay: ribbon, knots, traveler glyph

import { getViewport, normToPx } from '@utils/coords';
import type { Knot, SpiralConfig } from './types';

export class OverlayCanvas {
  constructor(private canvas: HTMLCanvasElement) {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width  = Math.floor(this.canvas.clientWidth  * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
  }

  clear() {
    const ctx = this.ctx();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSpiral(cfg: SpiralConfig, knots: Knot[], spiralScale:number, ribbonWidth:number) {
    const ctx = this.ctx(); const vp = getViewport(this.canvas);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';

    // soft-bodied ribbon: 3 strokes, inner to outer
    const widths = [1.0, 1.6, 2.2].map(f => ribbonWidth * f * vp.min * 0.004);
    const alphas = [0.9, 0.35, 0.15];

    for (let pass=0; pass<widths.length; pass++) {
      ctx.beginPath();
      knots.forEach((k, i) => {
        const x = k.pos[0] * spiralScale, y = k.pos[1] * spiralScale;
        const [px, py] = normToPx(x, y, vp);
        (i===0) ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.strokeStyle = `rgba(170, 200, 255, ${alphas[pass]})`;
      ctx.lineWidth = widths[pass];
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSpiralPolyline(pts: [number, number][], ribbonWidth: number) {
  const ctx = this.ctx(); const vp = getViewport(this.canvas);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';

  // soft-bodied ribbon: inner bright + two wider soft passes
  const widths = [1.0, 1.7, 2.6].map(f => ribbonWidth * f * vp.min * 0.0045);
  const alphas = [0.95, 0.40, 0.18];

  for (let p = 0; p < widths.length; p++) {
    ctx.beginPath();
    pts.forEach(([nx, ny], i) => {
      const [px, py] = normToPx(nx, ny, vp);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = `rgba(170, 200, 255, ${alphas[p]})`;
    ctx.lineWidth = Math.max(1, widths[p]);
    ctx.stroke();
  }

  ctx.restore();
}


  drawKnot(k: Knot, spiralScale:number, glow:number=0.0) {
    const ctx = this.ctx(); const vp = getViewport(this.canvas);
    const x = k.pos[0] * spiralScale, y = k.pos[1] * spiralScale;
    const [px, py] = normToPx(x, y, vp);
    const r = vp.min * 0.006;

    ctx.save();
    ctx.fillStyle = `rgba(230,245,255,${0.6+0.4*Math.max(0, Math.min(1,glow))})`;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
    // soft halo
    ctx.fillStyle = `rgba(180,210,255,0.18)`; ctx.beginPath(); ctx.arc(px, py, r*2.6, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  drawTraveler(pos:[number, number], spiralScale:number, phase01:number) {
    const ctx = this.ctx(); const vp = getViewport(this.canvas);
    const [px, py] = normToPx(pos[0]*spiralScale, pos[1]*spiralScale, vp);
    const r = vp.min * 0.012;

    ctx.save();
    ctx.translate(px, py);
    // little eye/leaf glyph
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r*0.9, 0, 0, r);
    ctx.quadraticCurveTo(-r*0.9, 0, 0, -r);
    ctx.closePath();
    ctx.fillStyle = `rgba(230,245,255,${0.85})`; ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,0.35)`; ctx.lineWidth = r*0.18; ctx.stroke();
    // inner dot
    ctx.beginPath(); ctx.arc(0, 0, r*0.25, 0, Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fill();
    ctx.restore();
  }

  private ctx(): CanvasRenderingContext2D {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    return ctx;
  }
}
