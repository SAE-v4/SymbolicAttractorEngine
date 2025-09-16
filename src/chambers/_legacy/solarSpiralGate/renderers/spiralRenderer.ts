// renderers/spiralRenderer.ts
import { PAL } from "@/chambers/_legacy/solarSpiralGate/config/palette";
import type { ChamberDef } from "@types/ChamberDef";

export function drawSpiralRiver(
  g: CanvasRenderingContext2D,
  def: ChamberDef,
  cx: number, cy: number,
  r0: number,               // starting radius
  phase: number,            // 0..1 chamber phase
  inhale: number = 0        // 0..1 breath amplitude (inhale)
){
  const pal = PAL(def);
  const s = def.spiral!;
  const TWO_PI = Math.PI*2;

  // --- offscreen AA (2x supersample)
  const scale = window.devicePixelRatio > 1 ? 1.5 : 2.0;
  const w = g.canvas.width, h = g.canvas.height;
  const off = document.createElement("canvas");
  off.width = Math.ceil(w*scale); off.height = Math.ceil(h*scale);
  const og = off.getContext("2d")!;
  og.scale(scale, scale);

  // Spiral: Archimedean r = a + bθ
  const turns = s.turns;
  const a = r0;
  const b = (r0*0.65)/ (turns * TWO_PI); // gentle spacing
  const steps = 480;
  const tMax = turns * TWO_PI * s.length;

  const periPhase = (s.peristalsis.phase + phase) % 1;

  // --- NEW: global width pulse + gentle radial wobble
  const breath = Math.max(0, Math.min(1, inhale));
  const pulse  = 0.90 + 0.35 * breath;             // width swell with breath
  const baseW  = s.baseWidth * pulse;              // (replaces old wBase)
  const wobAmp = r0 * 0.015 * breath;              // 1.5% radius wobble at full inhale
  const wobK   = 0.6;                               // wobble spatial freq (radians)

  const peri = (t:number) => {
    // peristaltic width modulation along arc parameter t (0..1 of θ range)
    const osc = Math.sin((t * s.peristalsis.freq * TWO_PI) + periPhase*TWO_PI);
    return baseW * (1 + s.peristalsis.amp * 0.5 * osc);
  };

  // path
  og.lineCap = "round";
  og.lineJoin = "round";

  // halo pass
  og.strokeStyle = pal.css("spiral", 0.18);
  og.shadowColor = pal.css("spiral", 0.55);
  og.shadowBlur = 24;
  og.beginPath();
  for (let i=0;i<=steps;i++){
    const θ = (i/steps) * tMax;
    const r = a + b*θ + wobAmp * Math.sin(θ*wobK + phase*TWO_PI);   // <- wobble
    const x = cx + r*Math.cos(θ);
    const y = cy + r*Math.sin(θ);
    i===0 ? og.moveTo(x,y) : og.lineTo(x,y);
  }
  og.lineWidth = (baseW + s.glow.halo) * (1.6 + 0.4*breath);        // <- pulse halo
  og.stroke();

  // core pass
  og.shadowBlur = 0;
  og.strokeStyle = pal.css("spiral", 0.9);
  og.beginPath();
  const CHUNK = 8;                                                  // smoother than 12
  for (let i=0;i<=steps;i++){
    const θ = (i/steps) * tMax;
    const r = a + b*θ + wobAmp * Math.sin(θ*wobK + phase*TWO_PI);   // <- wobble
    const x = cx + r*Math.cos(θ);
    const y = cy + r*Math.sin(θ);
    i===0 ? og.moveTo(x,y) : og.lineTo(x,y);
    // vary width along the path
    if (i % CHUNK === 0) {
      og.lineWidth = peri(i/steps) + s.glow.core;                    // <- uses pulsed baseW
      og.stroke(); og.beginPath(); og.moveTo(x,y);
    }
  }
  og.lineWidth = peri(1.0) + s.glow.core;
  og.stroke();

  // composite back with smoothing
  g.save();
  g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = "lighter";
  g.drawImage(off, 0, 0, off.width, off.height, 0, 0, w, h);
  g.restore();
}
