import { PAL } from "@/config/palette";
import type { ChamberDef } from "@/types/ChamberDefs";

export function drawSpiralRibbon(
  g: CanvasRenderingContext2D,
  def: ChamberDef,
  cx: number, cy: number,
  r0: number,
  phase: number,    // 0..1
  inhale: number    // 0..1
){
  const pal = PAL(def);
  const s = def.spiral!;
  const TWO_PI = Math.PI*2;

  // offscreen for cheap AA
  const scale = window.devicePixelRatio > 1 ? 1.5 : 2.0;
  const W = g.canvas.width, H = g.canvas.height;
  const off = document.createElement("canvas");
  off.width = Math.ceil(W*scale); off.height = Math.ceil(H*scale);
  const og = off.getContext("2d")!; og.scale(scale, scale);

  // centerline
  const a = r0;
  const turns = s.turns;
  const thetaMax = turns * TWO_PI * s.length;
  const b = (r0*0.65)/(turns*TWO_PI);
  const steps = 420;

  // width/taper + gentle wobble
  const periPhase = (s.peristalsis.phase + phase) % 1;
  const baseW = s.baseWidth * (0.90 + 0.45*inhale);
  const wobAmp = r0 * 0.02 * inhale;
  const wobK = 0.6;

  const widthAt = (t01:number) => {
    const osc = Math.sin((t01*s.peristalsis.freq*TWO_PI) + periPhase*TWO_PI);
    const head = smoothstep(0.04,0.18,t01);
    const tail = 1 - smoothstep(0.78,0.97,t01);
    const taper = Math.min(head, tail);
    return baseW * (1 + 0.5*s.peristalsis.amp*osc) * (0.25 + 0.75*taper);
  };

  const P:{x:number;y:number}[] = [];
  for (let i=0;i<=steps;i++){
    const t = i/steps;
    const th = t*thetaMax;
    const r = a + b*th + wobAmp*Math.sin(th*wobK + phase*TWO_PI);
    P.push({ x: cx + r*Math.cos(th), y: cy + r*Math.sin(th) });
  }

  // normals → ribbon polygon
  const L: {x:number;y:number}[] = [];
  const R: {x:number;y:number}[] = [];
  for (let i=0;i<P.length;i++){
    const p = P[i], q = P[Math.min(i+1,P.length-1)];
    const vx = q.x-p.x, vy = q.y-p.y;
    const m = Math.hypot(vx,vy)||1;
    const nx = -vy/m, ny = vx/m;           // left normal
    const wv = 0.5*widthAt(i/(P.length-1));
    L.push({ x:p.x+nx*wv, y:p.y+ny*wv });
    R.push({ x:p.x-nx*wv, y:p.y-ny*wv });
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

  // core ribbon
  og.save();
  og.globalCompositeOperation = "lighter";
  og.fillStyle = pal.css("spiral", 0.88);
  og.beginPath();
  og.moveTo(L[0].x,L[0].y);
  for (let i=1;i<L.length;i++) og.lineTo(L[i].x,L[i].y);
  for (let i=R.length-1;i>=0;i--) og.lineTo(R[i].x,R[i].y);
  og.closePath(); og.fill();
  og.restore();

  // composite back
  g.save();
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = "lighter";
  g.drawImage(off, 0,0, off.width,off.height, 0,0, W,H);
  g.restore();
}

function smoothstep(a:number,b:number,x:number){
  const t = Math.min(1, Math.max(0, (x-a)/(b-a)));
  return t*t*(3-2*t);
}
