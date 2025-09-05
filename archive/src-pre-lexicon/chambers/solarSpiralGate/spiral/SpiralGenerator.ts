// archimedean/log spiral + knots (normalized coords)

import { polarToNorm } from "@utils/coords";
import type { Knot, SpiralConfig } from './types';

export function genKnots(cfg: SpiralConfig): Knot[] {
  const totalTheta = cfg.turns * Math.PI * 2;
  const thetas = Array.from({length: cfg.knots.count}, (_, i) =>
    (cfg.knots.spacing === 'even-theta')
      ? (i / Math.max(1, cfg.knots.count - 1)) * totalTheta
      : (i / Math.max(1, cfg.knots.count - 1)) * totalTheta // TODO: arc-length spacing
  );

  return thetas.map(theta => {
    const r = (cfg.type === 'archimedean') ? (cfg.a + cfg.k * theta)
            : /* log */                      (cfg.a * Math.exp(cfg.k * theta));
    const pos = polarToNorm(r, theta);
    return { theta, r, pos };
  });
}

// Apply breathing morphs (scale only for slice 1)
export function applyBreathToRadius(r:number, breathSS:number, eps:number) {
  return (1 + eps * breathSS) * r;
}

// Return a dense list of normalized points along the spiral for drawing the ribbon.
// Keeps your Knot[] (checkpoints) separate.
export function genSpiralPolylinePoints(
  cfg: SpiralConfig,
  stepsPerTurn = 160,               // try 120–200 for smoothness
  breathSS = 0,
  scaleEps = cfg.breathe.scaleEpsilon
): [number, number][] {
  const totalTheta = cfg.turns * Math.PI * 2;
  const steps = Math.max(8, Math.ceil(stepsPerTurn * cfg.turns));
  const S = 1 + scaleEps * breathSS;

  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * totalTheta;
    const r0 = (cfg.type === 'archimedean') ? (cfg.a + cfg.k * theta)
            : /* log */                      (cfg.a * Math.exp(cfg.k * theta));
    const r = S * r0;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    pts.push([x, y]);
  }
  return pts;
}
