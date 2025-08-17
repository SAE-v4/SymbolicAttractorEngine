// debug/overlay.ts
export function drawWitnessDebug(
  g: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  facing: { x: number; y: number },
  opts: { scale?: number } = {}
) {
  const s = opts.scale ?? 28; // arrow length
  const fx = pos.x + facing.x * s;
  const fy = pos.y + facing.y * s;

  g.save();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.fillStyle = 'rgba(255,255,255,0.9)';

  // position dot
  g.beginPath(); g.arc(pos.x, pos.y, 3, 0, Math.PI * 2); g.fill(); g.stroke();

  // facing arrow
  g.beginPath(); g.moveTo(pos.x, pos.y); g.lineTo(fx, fy); g.stroke();
  g.beginPath(); g.arc(fx, fy, 3, 0, Math.PI * 2); g.fill(); g.stroke();

  // text
  const mag = Math.hypot(facing.x, facing.y);
  const angle = Math.atan2(facing.y, facing.x) * 180 / Math.PI; // canvas Y+ down
  g.font = '12px ui-sans-serif';
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillText(`pos(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`, pos.x + 8, pos.y - 10);
  g.fillText(`dir(${facing.x.toFixed(2)}, ${facing.y.toFixed(2)}) ∠ ${angle.toFixed(1)}° | |v|=${mag.toFixed(2)}`,
             pos.x + 8, pos.y + 12);
  g.restore();
}
