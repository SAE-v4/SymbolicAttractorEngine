// src/renderers/beeAvatar.ts
import type { ChamberDef } from "@/types/ChamberDefs";
import { PAL } from "@/config/palette";

export type BeeAvatarOpts = {
  radius?: number;                 // default 16 (px in screen space)
  facing?: { x: number; y: number }; // normalized or not; we normalize inside
  inhale01?: number;               // 0..1 (for gentle pulse)
  phase?: number;                  // 0..1 (for wing flutter)
};

function norm(v:{x:number;y:number}) {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x/m, y: v.y/m };
}

export function drawBeeAvatar(
  g: CanvasRenderingContext2D,
  def: ChamberDef,
  cx: number, cy: number,
  opts: BeeAvatarOpts = {}
){
  const pal = PAL(def);
  const rBase = opts.radius ?? 16;
  const f = norm(opts.facing ?? { x: 0, y: -1 });
  const ang = Math.atan2(f.y, f.x);
  const inhale = Math.max(0, Math.min(1, opts.inhale01 ?? 0));
  const phase = opts.phase ?? 0;

  // gentle breathing pulse
  const r = rBase * (0.92 + 0.08 * (0.5 - Math.cos(inhale * Math.PI) * 0.5));

  g.save();

  // soft center halo
  g.globalCompositeOperation = "lighter";
  g.shadowColor = pal.css("ring", 0.55);
  g.shadowBlur  = 14;
  g.fillStyle   = pal.css("ring", 0.08);
  g.beginPath(); g.arc(cx, cy, r * 1.5, 0, Math.PI*2); g.fill();

  // body
  g.shadowBlur  = 0;
  g.globalCompositeOperation = "source-over";
  const bodyGrad = g.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
  bodyGrad.addColorStop(0, pal.css("spark", 0.95));
  bodyGrad.addColorStop(1, pal.css("ring", 0.85));
  g.fillStyle = bodyGrad;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.fill();

  // facing needle (small, readable)
  g.strokeStyle = pal.css("spark", 0.95);
  g.lineWidth = Math.max(2, r * 0.18);
  g.lineCap = "round";
  const n0x = cx + Math.cos(ang) * (r * 0.25);
  const n0y = cy + Math.sin(ang) * (r * 0.25);
  const n1x = cx + Math.cos(ang) * (r * 1.35);
  const n1y = cy + Math.sin(ang) * (r * 1.35);
  g.beginPath(); g.moveTo(n0x, n0y); g.lineTo(n1x, n1y); g.stroke();

  // wings (subtle flutter)
  const flap = 0.45 + 0.35 * Math.sin((phase * Math.PI * 2) * 2.0);
  g.globalAlpha = 0.85;
  g.fillStyle = pal.css("ring", 0.35);

  const drawWing = (side:number) => {
    g.save();
    g.translate(cx, cy);
    g.rotate(ang + side * (Math.PI/2.3));
    g.scale(1, flap);
    g.beginPath();
    g.ellipse(r*0.45, 0, r*0.45, r*0.25, 0, 0, Math.PI*2);
    g.fill();
    g.restore();
  };
  drawWing(+1);
  drawWing(-1);

  // tiny head dot
  g.fillStyle = pal.css("spark", 1.0);
  const hx = cx + Math.cos(ang) * (r * 0.65);
  const hy = cy + Math.sin(ang) * (r * 0.65);
  g.beginPath(); g.arc(hx, hy, r*0.12, 0, Math.PI*2); g.fill();

  g.restore();
}
