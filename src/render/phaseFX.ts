export function drawPhaseFX(
  g: CanvasRenderingContext2D,
  phase: number,
  w: number,
  h: number
) {
  g.save();
  g.clearRect(0, 0, w, h);

  const i = 0.5 + 0.35 * Math.sin(phase * Math.PI * 2);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgba(200,210,255, ${0.45 + 0.25 * i})`);
  grad.addColorStop(1, `rgba(235,242,255, 0.75)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // soft horizontal bands
  g.globalCompositeOperation = "overlay";
  const rows = 9;
  for (let y = 0; y < rows; y++) {
    const t = y / (rows - 1);
    const s = Math.sin(phase * Math.PI * 2 + t * Math.PI * 2);
    const alpha = 0.06 + 0.10 * Math.max(0, s);
    g.fillStyle = `rgba(200,210,255, ${alpha})`;
    const y0 = t * h;
    g.fillRect(0, y0 - 8, w, 16);
  }
  g.restore();
}
