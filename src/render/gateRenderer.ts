// render/gateRenderer.ts
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
  bloom: number,
  strength = 1   // 👈 add this
) {
  const { progress } = readout;
  const cx = w * 0.5, cy = h * 0.5;
  const baseR = Math.min(w, h) * 0.18;
  const r = baseR + progress * baseR * 0.9;

  g.save();

  // 1) RING
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.lineWidth = 6 + 12 * progress + 10 * bloom;
  const ringA = Math.min(1, (0.35 + 0.4 * progress + 0.25 * bloom) * strength);
  g.strokeStyle = `rgba(40,80,200, ${ringA})`;
  g.stroke();

  // 2) INNER GLOW (breath/bloom)  — the part you asked about
  // compute a boosted inner alpha with clamp
  const innerA0 = (0.18 + 0.34 * progress + 0.25 * bloom) * strength;
  const a0 = Math.max(0, Math.min(0.9, innerA0));       // clamp to keep additive sane

  // add a mid stop so the glow rolls off nicely on high-DPR/P3 screens
  const outer = r * 1.6 + 40 * bloom;
  const grad = g.createRadialGradient(cx, cy, r * 0.6, cx, cy, outer);
  grad.addColorStop(0.00, `rgba(150,180,255, ${a0})`);
  grad.addColorStop(0.65, `rgba(150,180,255, ${a0 * 0.35})`);
  grad.addColorStop(1.00, `rgba(150,180,255, 0)`);

  // additive looks great but can wash out on iPhone; keep alphas modest
  g.globalCompositeOperation = "lighter";
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, outer, 0, Math.PI * 2);
  g.fill();

  // 3) COHERENCE HALO (optional — leave as you have; also multiply alpha by strength)
  const coh = readout.sAlign * readout.sBreath * readout.sCoherent;
  if (coh > 0.1) {
    const glow = Math.min(1, coh * coh);
    const base = coh > 0.4 ? 0.12 : 0.0;
    const haloA = Math.min(1, (base + 0.32 * glow) * strength);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = `hsla(${200 + 60 * glow}, 100%, 70%, ${haloA})`;
    g.lineWidth = 20 * glow;
    g.beginPath(); g.arc(cx, cy, r + 15, 0, Math.PI * 2); g.stroke();
  }

  g.restore();
}
