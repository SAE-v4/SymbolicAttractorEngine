import { PAL } from "@/config/palette";
import type { ChamberDef } from "@/types/ChamberDefs";

// renderers/spiralRibbon.ts
export function drawSpiralRibbon(
  g: CanvasRenderingContext2D,
  def: ChamberDef,
  cx: number, cy: number,
  r0: number,
  phase: number,
  inhale: number,
  facing?: { x:number; y:number },
  cue?: { moveMag:number; align:number }
){
  const pal = PAL(def);
  const s   = def.spiral!;
  const TWO_PI = Math.PI * 2;

  // --- offscreen (clear each frame!) ---
  const W = g.canvas.width, H = g.canvas.height;
  const scale = window.devicePixelRatio > 1 ? 1.5 : 2.0;
  const off = getRibbonCanvas(W, H, scale);
  const og  = off.ctx;

  // clear then apply drawing scale
  og.setTransform(1, 0, 0, 1, 0, 0);
  og.clearRect(0, 0, off.canvas.width, off.canvas.height);
  og.setTransform(scale, 0, 0, scale, 0, 0);

  // --- parameters / helpers ---
  const face     = facing ? norm(facing) : { x: 0, y: -1 };
  const flowGain = (window as any).__flowBoost ?? 1;

  const a        = r0;
  const thetaMax = s.turns * TWO_PI * s.length;
  const b        = (r0 * 0.65) / (s.turns * TWO_PI);
  const steps    = 420;

  const periPhase = (s.peristalsis.phase + phase) % 1;

  // slimmer baseline + gentler alignment influence
  const baseW  = s.baseWidth * (0.80 + 0.35 * inhale);
  const wobAmp = r0 * 0.015 * (0.5 + inhale);
  const wobK   = 0.6;

  function widthAt(t01:number, align:number){
    const osc   = Math.sin(t01*s.peristalsis.freq*TWO_PI + periPhase*TWO_PI);
    const head  = smoothstep(0.04, 0.18, t01);
    const tail  = 1 - smoothstep(0.78, 0.97, t01);
    const taper = Math.min(head, tail);
    const peri  = 1 + 0.5 * s.peristalsis.amp * osc;
    const alignBoost = 0.65 + 0.65 * flowGain * align; // softer
    return baseW * peri * (0.25 + 0.75*taper) * alignBoost;
  }

  // --- centerline samples ---
  const P: {x:number;y:number}[] = [];
  for (let i=0;i<=steps;i++){
    const t  = i/steps;
    const th = t * thetaMax;
    const r  = a + b*th + wobAmp*Math.sin(th*wobK + phase*TWO_PI);
    P.push({ x: cx + r*Math.cos(th), y: cy + r*Math.sin(th) });
  }

  // --- offset edges ---
  const L: {x:number;y:number}[] = [];
  const R: {x:number;y:number}[] = [];
  for (let i=0;i<=steps;i++){
    const p = P[i], q = P[Math.min(i+1, steps)];
    const vx = q.x - p.x, vy = q.y - p.y;
    const m  = Math.hypot(vx, vy) || 1;
    const tx = vx/m, ty = vy/m;
    const nx = -ty, ny = tx;

    const dot   = tx*face.x + ty*face.y;      // [-1..1]
    const align = 0.5 * (1 + dot);            // [0..1]
    const w     = 0.5 * widthAt(i/steps, align);

    L.push({ x: p.x + nx*w, y: p.y + ny*w });
    R.push({ x: p.x - nx*w, y: p.y - ny*w });
  }

  // --- HALO (optional) ---
  if (!(window as any).__ribHaloOff){
    og.save();
    og.globalCompositeOperation = "lighter";
    og.shadowColor = pal.css("spiral", 0.55);
    og.shadowBlur  = 18;
    og.fillStyle   = pal.css("spiral", 0.10);
    og.beginPath();
    og.moveTo(L[0].x, L[0].y);
    for (let i=1;i<L.length;i++) og.lineTo(L[i].x, L[i].y);
    for (let i=R.length-1;i>=0;i--) og.lineTo(R[i].x, R[i].y);
    og.closePath();
    og.fill();
    og.restore();
  }

  // --- CORE (opaque gradient; no bleed) ---
  og.save();
  og.globalCompositeOperation = "source-over";
  const pA = P[Math.floor(P.length * 0.10)];
  const pB = P[P.length - 1];
  const grad = og.createLinearGradient(pA.x, pA.y, pB.x, pB.y);
  grad.addColorStop(0.00, pal.css("spiral", 1.00));
  grad.addColorStop(0.55, pal.css("spiral", 1.00));
  grad.addColorStop(1.00, pal.css("spiral", 0.96));
  og.fillStyle = grad;

  og.beginPath();
  og.moveTo(L[0].x, L[0].y);
  for (let i=1;i<L.length;i++) og.lineTo(L[i].x, L[i].y);
  for (let i=R.length-1;i>=0;i--) og.lineTo(R[i].x, R[i].y);
  og.closePath();
  og.fill();
  og.restore();

  // --- SHEEN (thin, optional) ---
  if (!(window as any).__sheenOff){
    og.save();
    og.globalCompositeOperation = "lighter";
    og.strokeStyle = pal.css("spiral", 0.96);
    og.globalAlpha = 0.75;
    og.lineCap = "round";
    og.shadowColor = pal.css("spiral", 0.9);
    og.shadowBlur  = 6;

    og.beginPath();
    let moved = false;
    for (let i=0;i<=steps;i++){
      const p = P[i], q = P[Math.min(i+1, steps)];
      const vx = q.x - p.x, vy = q.y - p.y;
      const m  = Math.hypot(vx, vy) || 1;
      const tx = vx/m, ty = vy/m;
      const nx = -ty, ny = tx;

      const dot   = tx*face.x + ty*face.y;
      const align = 0.5 * (1 + dot);
      const t01   = i/steps;
      const wLocal = widthAt(t01, align);
      const wSheen = Math.max(1.5, Math.min(wLocal * 0.28, 6 + 3*inhale));
      const edgeOff = wLocal * 0.38 * (0.3 + 0.7*align);

      og.lineWidth = wSheen;
      const hx = p.x + nx*edgeOff;
      const hy = p.y + ny*edgeOff;
      if (!moved) { og.moveTo(hx, hy); moved = true; }
      else        { og.lineTo(hx, hy); }
    }
    og.stroke();

    const iHead = Math.max(2, Math.min(steps-2, Math.floor(0.62 * steps)));
const H  = P[iHead], Hn = P[iHead+1], Hp = P[iHead-1];
const tv = { x: Hn.x - Hp.x, y: Hn.y - Hp.y };
const tm = Math.hypot(tv.x, tv.y) || 1;
const tx = tv.x / tm, ty = tv.y / tm;

if (cue) {
  const len = 6 + 34 * cue.moveMag;   // tail length from movement
  og.save();
  og.globalCompositeOperation = "lighter";
  og.strokeStyle = pal.css("spiral", 0.92);
  og.lineCap = "round";
  og.lineWidth = 2 + 3 * cue.moveMag;
  og.shadowColor = pal.css("spiral", 0.9);
  og.shadowBlur  = 10 * (0.4 + 0.6 * cue.align);
  og.beginPath();
  og.moveTo(H.x, H.y);
  og.lineTo(H.x + tx * len, H.y + ty * len);
  og.stroke();
  og.restore();
}

    og.restore();
  }

  // --- composite back (opaque over GL) ---
  g.save();
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = "source-over";
  g.drawImage(off.canvas, 0, 0, off.canvas.width, off.canvas.height, 0, 0, W, H);
  g.restore();
}


function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function norm(v: { x: number; y: number }) {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / m, y: v.y / m };
}

// simple offscreen cache (module-level)
const _ribbonOff = {
  canvas: document.createElement("canvas") as HTMLCanvasElement,
  ctx: null as any,
  W: 0,
  H: 0,
};
function getRibbonCanvas(W: number, H: number, scale: number) {
  const cw = Math.ceil(W * scale),
    ch = Math.ceil(H * scale);
  if (_ribbonOff.W !== cw || _ribbonOff.H !== ch) {
    _ribbonOff.canvas.width = cw;
    _ribbonOff.canvas.height = ch;
    _ribbonOff.W = cw;
    _ribbonOff.H = ch;
    _ribbonOff.ctx = _ribbonOff.canvas.getContext("2d", {
      alpha: true,
      colorSpace: "srgb",
    })!;
  }
  return _ribbonOff;
}
