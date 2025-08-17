// render/gateRenderer.ts
import { getBreath } from "@utils/breath";

type Readout = {
  progress: number;
  sAlign: number;
  sBreath: number;
  sCoherent: number;
};

export function drawGate(
  g: CanvasRenderingContext2D,
  phase: number,
  w: number,
  h: number,
  readout: Readout,
  bloom: number,
  strength = 1
) {
  const { progress } = readout;
  const breath = getBreath(phase); // 0..1

  const cx = w * 0.5;
  const cy = h * 0.5;

  // Base + progress + subtle breath swell
  const baseR = Math.min(w, h) * 0.18;
  const r = baseR * (1 + 0.03 * breath) + progress * baseR * 0.9;

  g.save();

  // 1) RING
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.lineJoin = "round";
  g.lineCap = "round";
  g.lineWidth = 6 + 12 * progress + 8 * breath + 10 * bloom;

  const ringA = Math.min(0.9, (0.35 + 0.4 * progress + 0.25 * bloom) * strength);
  g.strokeStyle = `rgba(40,80,200,${ringA})`;
  g.stroke();

  // 2) INNER GLOW (breath/bloom) — fully scoped
  {
    const innerA0 = (0.18 + 0.34 * progress + 0.25 * bloom) * strength;
    const a0 = Math.max(0, Math.min(0.9, innerA0));
    const outer = r * 1.6 + 40 * bloom;

    const grad = g.createRadialGradient(cx, cy, r * 0.6, cx, cy, outer);
    grad.addColorStop(0.00, `rgba(150,180,255,${a0})`);
    grad.addColorStop(0.65, `rgba(150,180,255,${a0 * 0.35})`);
    grad.addColorStop(1.00, `rgba(150,180,255,0)`);

    g.save(); // isolate additive
    g.globalCompositeOperation = "lighter";
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, outer, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // 3) COHERENCE HALO (optional)
  {
    const coh = readout.sAlign * readout.sBreath * readout.sCoherent;
    if (coh > 0.1) {
      const glow = Math.min(1, coh * coh);
      const base = coh > 0.4 ? 0.12 : 0.0;
      const haloA = Math.min(1, (base + 0.32 * glow) * strength);

      g.save();
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = `hsla(${200 + 60 * glow}, 100%, 70%, ${haloA})`;
      g.lineWidth = 20 * glow;
      g.beginPath();
      g.arc(cx, cy, r + 15, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  g.restore();
}
