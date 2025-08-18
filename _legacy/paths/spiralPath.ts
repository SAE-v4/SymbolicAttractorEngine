// src/paths/spiralPath.ts
// Generates an Archimedean spiral as an SVG path string (`d="M ... L ..."`).
// Centered at (0,0) in SVG coordinates (y down). You can translate/scale it via <g> or in canvas mapping.

export type SpiralOpts = {
  turns: number;          // e.g. 3.5
  innerR: number;         // px, where the spiral starts
  outerR: number;         // px, where the spiral ends
  segsPerTurn?: number;   // resolution (default 64)
};

export function makeArchimedeanSpiralPath(opts: SpiralOpts): string {
  const { turns, innerR, outerR, segsPerTurn = 64 } = opts;
  const steps = Math.max(8, Math.floor(segsPerTurn * turns));
  const a = innerR;                            // r(θ) = a + bθ
  const b = (outerR - innerR) / (2 * Math.PI * turns);
  let d = "";

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * (2 * Math.PI * turns);
    const r = a + b * theta;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);             // SVG y-down is fine; consistent everywhere
    d += (i === 0 ? `M ${x.toFixed(3)} ${y.toFixed(3)}` : ` L ${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return d;
}
