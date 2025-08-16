export function drawWitness(
  g: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  vel: { x: number; y: number },
  facing: { x: number; y: number },
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
}
