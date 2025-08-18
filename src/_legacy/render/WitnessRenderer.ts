import { getBreath } from "_legacy/utils/breath";
import { BREATH_TUNING as T } from "@config/breath";

export function drawWitness(
  g: CanvasRenderingContext2D,
  phase: number,
  pos: { x: number; y: number },
  _vel: { x: number; y: number },
  facing: { x: number; y: number },
  _thrust: number
) {
  const breath = getBreath(phase);

  // --- 1) Aura (UNDER everything) ---
  {
    const auraR = T.witness.auraRBase + T.witness.auraRGain * breath;
    const a = T.witness.auraABase + T.witness.auraAGain * breath;

    g.save();
    g.globalCompositeOperation = "source-over";
    const aura = g.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, auraR);
    aura.addColorStop(0, `rgba(80,120,255,${a})`);
    aura.addColorStop(1, "rgba(80,120,255,0)");
    g.fillStyle = aura;
    g.beginPath();
    g.arc(pos.x, pos.y, auraR, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // --- 2) Core dot ---
  {
    g.save();
    g.globalCompositeOperation = "source-over";
    g.beginPath();
    g.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    g.fillStyle = "rgba(40,80,200,0.95)";
    g.fill();

    // optional crisp edge (subtle outline)
    g.lineWidth = 1.5;
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.stroke();
    g.restore();
  }

  // --- 3) Facing line ---
  {
    const fx = pos.x + facing.x * 40;
    const fy = pos.y + facing.y * 40;
  drawFacingLine(g, pos, { x: fx, y: fy });
  }
}

function drawFacingLine(
  g: CanvasRenderingContext2D,
  from: {x:number,y:number},
  to:   {x:number,y:number}
) {
  g.save();
  g.globalCompositeOperation = "source-over";
  g.lineCap = "round";

  // 1) Contrast under-stroke (dark)
  g.strokeStyle = "rgba(20,30,60,0.55)";   // cool dark
  g.lineWidth = 4;                          // slightly wider
  g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); g.stroke();

  // 2) Bright stroke (yellow) + gentle shadow
  g.shadowColor = "rgba(0,0,0,0.18)";
  g.shadowBlur  = 3;
  g.strokeStyle = "rgba(255,220,40,0.95)";
  g.lineWidth   = 2.5;
  g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); g.stroke();

  g.restore();
}
