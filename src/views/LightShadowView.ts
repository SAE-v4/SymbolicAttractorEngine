import { IRenderer } from "@/render/IRenderer";

export class LightShadowView {
  constructor(private r: IRenderer) {}

  render(breathValue: number) {
    // Passive coherence: peak at pause (breathValue≈0)
    const coherence = Math.max(0, 1 - Math.abs(breathValue)); // 0..1
    const a = Math.max(0.25, coherence);                       // keep visible

    const r = this.r;
    r.beginFrame();
    r.clear("#0a0d12");

    // Center + ring scale (breathing)
    const cx = 0.5, cy = 0.55;
    const base = 0.18;
    const R = base * (1 + breathValue * 0.30);

    // Radar rings (walls)
    for (let i = 1; i <= 5; i++) {
      r.setAlpha(0.12 + 0.10 * (i / 5));
      r.setStroke("rgba(180,230,255,0.8)", 1, [6, 8]);
      r.circleNDC(cx, cy, R * (i / 5), false);
    }

    // Axis line (clarity with coherence)
    r.setAlpha(a);
    r.setStroke("#ffffff", 2);
    r.lineNDC(cx, cy - R * 0.8, cx, cy + R * 0.8);

    // Sun glyph (upper pole)
    r.setFill("rgba(255,210,100,1)");
    r.circleNDC(cx, cy - R * 0.9, R * 0.12, true);

    // Shadow spiral (lower pole)
    r.setStroke("rgba(120,210,255,0.75)", 1.5);
    const turns = 2.2, steps = 56;
    for (let s = 0; s <= steps; s++) {
      const t = (turns * Math.PI * 2) * (s / steps);
      const rr = (R * 0.20) * (s / steps);
      const x = cx + rr * Math.cos(t);
      const y = cy + R * 0.90 - rr * Math.sin(t);
      if (s === 0) r.pathMoveNDC(x, y); else r.pathLineNDC(x, y);
    }
    r.pathStroke();

    r.endFrame();
  }
}
