type Readout = {
  progress: number;
  sAlign: number;
  sBreath: number;
  sCoherent: number;
};

export function drawGate(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  readout: Readout,
  bloom: number
) {
  const { progress } = readout;
  const cx = w * 0.5, cy = h * 0.5;
  const baseR = Math.min(w, h) * 0.18;
  const r = baseR + progress * baseR * 0.9;

  g.save();
  // ring
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.lineWidth = 6 + 12 * progress + 10 * bloom;
  g.strokeStyle = `rgba(40,80,200, ${0.35 + 0.4 * progress + 0.25 * bloom})`;
  g.stroke();

  // glow
  const rg = g.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.6 + 40 * bloom);
  rg.addColorStop(0, `rgba(150,180,255, ${0.18 + 0.34 * progress + 0.25 * bloom})`);
  rg.addColorStop(1, `rgba(150,180,255, 0)`);
  g.globalCompositeOperation = "lighter";
  g.fillStyle = rg;
  g.beginPath();
  g.arc(cx, cy, r * 1.6 + 40 * bloom, 0, Math.PI * 2);
  g.fill();

  const coherenceProduct = readout.sAlign * readout.sBreath * readout.sCoherent;
if (coherenceProduct > 0.1) {
  const glow = Math.min(1, Math.pow(coherenceProduct, 2));
  g.save();
  g.strokeStyle = `hsla(${200 + 60 * glow}, 100%, 70%, ${0.2 + glow * 0.4})`;
  g.lineWidth = 20 * glow;
  g.beginPath();
  g.arc(cx, cy, radius + 15, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

  g.restore();
}
