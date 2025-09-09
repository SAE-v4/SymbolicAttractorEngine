// src/views/LightShadowPrototype.ts
import { IRenderer } from "@/render/IRenderer";

export class LightShadowPrototype {
  private theta = 0; // phase accumulator

  constructor(private r: IRenderer) {}

  render(breath: { value: number; phase: "inhale" | "exhale" | "pause" }) {
    const r = this.r;
    r.beginFrame();
    r.clear("#0a0d12");

    const cx = 0.5, cy = 0.5;
    const base = 0.4;
    this.theta += 0.02; // slow drift for moire/interference

    if (breath.phase === "inhale") {
      // Concentric contraction
      const rings = 12;
      for (let i = 1; i <= rings; i++) {
        const scale = (i / rings) * (1 - 0.3 * breath.value);
        r.setAlpha(0.2);
        r.setStroke("rgba(120,200,255,0.7)", 1);
        r.circleNDC(cx, cy, base * scale, false);
      }
    }

    if (breath.phase === "exhale") {
      // Radial burst
      const rays = 64;
      const burst = base * (1 + 0.2 * breath.value);
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const len = burst * (0.5 + 0.5 * Math.sin(this.theta + i * 0.2));
        r.setAlpha(0.3 + 0.7 * Math.abs(Math.sin(this.theta)));
        r.setStroke("rgba(255,210,100,0.9)", 1.2);
        r.lineNDC(cx, cy, cx + dx * len, cy + dy * len);
      }
    }

if (breath.phase === "pause") {
  const rings = 40;
  const amp = 0.02;
  for (let i = 1; i <= rings; i++) {
    const rr = base * (i / rings);
    // never offset more than half the ring radius
    const localAmp = Math.min(amp, rr * 0.5);
    const offset = Math.sin(this.theta * 3 + i * 0.3) * localAmp;

    this.r.setAlpha(0.08 + 0.04 * Math.sin(this.theta + i * 0.1));
    this.r.setStroke("rgba(200,200,255,0.5)", 1);
    this.r.circleNDC(cx, cy, rr + offset, false);
  }
}


    // Bee distortion (tiny wobble at center)
    r.setAlpha(0.8);
    r.setFill("rgba(255,255,255,0.8)");
    const wobble = 0.01 * Math.sin(this.theta * 2);
    r.circleNDC(cx + wobble, cy, 0.015, true);

    r.endFrame();
  }
}
