import { getBreath } from "@utils/breath";

export function drawWitness(
  g: CanvasRenderingContext2D,
  phase: number,
  pos: {x:number,y:number},
  vel: {x:number,y:number},
  facing: {x:number,y:number},
  thrust: number
) {
  // velocity tail
  g.save();
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = "rgba(40,180,100,0.5)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(pos.x, pos.y);
  g.lineTo(pos.x - vel.x * 0.12, pos.y - vel.y * 0.12);
  g.stroke();
  g.restore();

  // body
  g.save();
  g.shadowColor = "rgba(20,40,120,0.35)";
  g.shadowBlur = 16;
  g.fillStyle = "rgba(30,60,140,0.95)";
  g.beginPath();
  g.arc(pos.x, pos.y, 8 + 6 * thrust, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // facing (command)
  g.save();
  g.strokeStyle = "rgba(230,160,40,0.9)";
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(pos.x, pos.y);
  g.lineTo(pos.x + facing.x * 40, pos.y + facing.y * 40);
  g.stroke();
  g.restore();

    const breath = getBreath(phase);
  const auraR = 15 + 10 * breath;
  const aura = g.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, auraR);
  aura.addColorStop(0, `rgba(80,120,255,${0.05 + 0.10 * breath})`);
  aura.addColorStop(1, "rgba(80,120,255,0)");
  g.fillStyle = aura;
  g.beginPath(); g.arc(pos.x, pos.y, auraR, 0, Math.PI * 2); g.fill();
}
