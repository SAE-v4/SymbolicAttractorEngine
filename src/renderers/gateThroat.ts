// src/renderers/gateThroat.ts
export function drawGateThroat(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  inhale01: number
) {
  // A soft aperture just inside the main ring. Opens slightly on inhale.
  const r0 = r * (0.64 + 0.02 * inhale01);

  const grad = g.createRadialGradient(cx, cy, r0 * 0.85, cx, cy, r0 * 1.25);
grad.addColorStop(0.0, "rgba(255,240,180,0.06)");
grad.addColorStop(1.0, "rgba(10,20,40,0.65)");

  g.save();
  g.globalCompositeOperation = "multiply";
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, r0 * 1.25, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
