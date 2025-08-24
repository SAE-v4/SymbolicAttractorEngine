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
  facing?: { x:number; y:number }   // NEW (unit vector preferred)
){
  const pal = PAL(def);
  const s = def.spiral!;
  const TWO_PI = Math.PI*2;

  // --- offscreen reuse (see perf note below) ---
  const W = g.canvas.width, H = g.canvas.height;
  const scale = window.devicePixelRatio > 1 ? 1.5 : 2.0;

  // REUSE a module-level canvas (see note 3)
  const off = getRibbonCanvas(W, H, scale);
  const og = off.ctx;
  og.setTransform(scale, 0, 0, scale, 0, 0);

  // centerline
  const a = r0;
  const thetaMax = s.turns * TWO_PI * s.length;
  const b = (r0*0.65)/(s.turns*TWO_PI);
  const steps = 420;

  // modulation
  const periPhase = (s.peristalsis.phase + phase) % 1;
  const baseW = s.baseWidth * (0.90 + 0.45*inhale);
  const wobAmp = r0 * 0.02 * inhale;
  const wobK = 0.6;

  const widthAt = (t01:number, align:number) => {
    const osc = Math.sin((t01*s.peristalsis.freq*TWO_PI) + periPhase*TWO_PI);
    const head = smoothstep(0.04,0.18,t01);
    const tail = 1 - smoothstep(0.78,0.97,t01);
    const taper = Math.min(head, tail);
    const peri = (1 + 0.5*s.peristalsis.amp*osc);
    // alignment boost (0..1): 0.75–1.25 multiplier
    const alignBoost = 0.55 + (1.00 * flowGain) * align; // range ~0.55..1.55 (×flowGain)

    return baseW * peri * (0.25 + 0.75*taper) * alignBoost;
  };

  const face = facing ? norm(facing) : { x: 0, y: -1 }; // up as default

  const flowGain = (window as any).__flowBoost ?? 1;  // 1 by default

  const P: {x:number;y:number}[] = [];
  for (let i=0;i<=steps;i++){
    const t = i/steps;
    const th = t*thetaMax;
    const r = a + b*th + wobAmp*Math.sin(th*wobK + phase*TWO_PI);
    P.push({ x: cx + r*Math.cos(th), y: cy + r*Math.sin(th) });
  }

  const L: {x:number;y:number}[] = [];
  const R: {x:number;y:number}[] = [];

  for (let i=0;i<P.length;i++){
    const p = P[i], q = P[Math.min(i+1,P.length-1)];
    const vx = q.x - p.x, vy = q.y - p.y;
    const m = Math.hypot(vx,vy) || 1;
    const tx = vx/m, ty = vy/m;          // tangent (unit)
    const align = 0.5 * (1 + (tx*face.x + ty*face.y)); // 0..1
    const wv = 0.5 * widthAt(i/(P.length-1), align);

    const nx = -ty, ny = tx;             // left normal
    L.push({ x: p.x + nx*wv, y: p.y + ny*wv });
    R.push({ x: p.x - nx*wv, y: p.y - ny*wv });
  }

  // halo
  og.save();
  og.globalCompositeOperation = "lighter";
  og.shadowColor = pal.css("spiral", 0.65);
  og.shadowBlur = 26;
  og.fillStyle = pal.css("spiral", 0.17);
  og.beginPath();
  og.moveTo(L[0].x,L[0].y);
  for (let i=1;i<L.length;i++) og.lineTo(L[i].x,L[i].y);
  for (let i=R.length-1;i>=0;i--) og.lineTo(R[i].x,R[i].y);
  og.closePath(); og.fill();
  og.restore();

  // core
  og.save();
  og.globalCompositeOperation = "lighter";
  og.fillStyle = pal.css("spiral", 0.88);
  og.beginPath();
  og.moveTo(L[0].x,L[0].y);
  for (let i=1;i<L.length;i++) og.lineTo(L[i].x,L[i].y);
  for (let i=R.length-1;i>=0;i--) og.lineTo(R[i].x,R[i].y);
  og.closePath(); og.fill();
  og.restore();

  // after the "core ribbon" fill, add a sheen pass:
og.save();
og.globalCompositeOperation = "lighter";
og.strokeStyle = pal.css("spiral", 0.95);
og.lineCap = "round";
og.shadowColor = pal.css("spiral", 0.9);
og.shadowBlur = 10;

const SEG = 7; // segment granularity for varying width
og.beginPath();
for (let i=0;i<=steps;i++){
  const p = P[i];
  const q = P[Math.min(i+1, steps)];
  const vx = q.x - p.x, vy = q.y - p.y;
  const m  = Math.hypot(vx,vy) || 1;
  const tx = vx/m, ty = vy/m;              // local tangent
  const dot = tx*face.x + ty*face.y;       // [-1..1]
  const align = 0.5 * (1 + dot);           // [0..1]
  const wHi = 1.5 + (8.0 * flowGain) * align + 2.5 * inhale;

  if (i % SEG === 0) { og.lineWidth = wHi; og.moveTo(p.x, p.y); }
  og.lineTo(q.x, q.y);
}
og.stroke();
og.restore();

  // composite back
  g.save();
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = "lighter";
  g.drawImage(off.canvas, 0,0, off.canvas.width,off.canvas.height, 0,0, W,H);
  g.restore();

  
}

function smoothstep(a:number,b:number,x:number){
  const t = Math.min(1, Math.max(0, (x-a)/(b-a)));
  return t*t*(3-2*t);
}

function norm(v:{x:number;y:number}){ const m=Math.hypot(v.x,v.y)||1; return {x:v.x/m,y:v.y/m}; }

// simple offscreen cache (module-level)
const _ribbonOff = { canvas: document.createElement("canvas") as HTMLCanvasElement, ctx: null as any, W:0, H:0 };
function getRibbonCanvas(W:number,H:number,scale:number){
  const cw = Math.ceil(W*scale), ch = Math.ceil(H*scale);
  if (_ribbonOff.W !== cw || _ribbonOff.H !== ch){
    _ribbonOff.canvas.width = cw;
    _ribbonOff.canvas.height = ch;
    _ribbonOff.W = cw; _ribbonOff.H = ch;
    _ribbonOff.ctx = _ribbonOff.canvas.getContext("2d", {alpha:true, colorSpace:"srgb"})!;
  }
  return _ribbonOff;
}
