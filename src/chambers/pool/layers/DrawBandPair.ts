// src/chambers/pool/layers/drawBandPair.ts
export type BandPairParams = {
  g: CanvasRenderingContext2D;
  x: number;            // left (usually 0)
  y: number;            // band centerline
  w: number;            // full width
  spacing: number;      // distance between band centers
  thick: number;        // nominal thickness of the band envelope
  lead: number;         // signed offset for shadow pass (+ downwards)
  lag: number;          // signed offset for light pass   (typically -lead*0.5)
  softness: number;     // 0..1 (lower = sharper)
  colors: { shadow: string; light: string };
  alpha: { shadow: number; light: number };    // final per-pass alpha (0..1)
  feather?: number;     // px edge softening (default ~1.5)
};

/**
 * Draws one horizontal band as two passes:
 *  1) Shadow pass slightly leading  (darker lane)
 *  2) Light  pass slightly lagging  (brighter lane)
 * Adds a subtle top/bottom edge feather for softness (no blur needed).
 */
export function drawBandPair(p: BandPairParams) {
  const {
    g, x, y, w, spacing, thick, lead, lag, softness,
    colors, alpha, feather = 1.5,
  } = p;

  // Effective paint thickness (softness narrows or widens the painted lane)
  const eff = Math.max(1, thick * Math.max(0.1, softness));
  const half = eff * 0.5;

  // --- SHADOW PASS ---
  g.save();
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = Math.max(0, Math.min(1, alpha.shadow));
  g.fillStyle = colors.shadow;
  g.fillRect(x, (y + lead) - half, w, eff);

  // soft top & bottom edges (alpha ramps)
  g.globalAlpha *= 0.6;
  g.fillRect(x, (y + lead) - half - feather, w, feather);   // top ramp
  g.fillRect(x, (y + lead) + half,          w, feather);    // bottom ramp
  g.restore();

  // --- LIGHT PASS ---
  // Slightly thinner to sell the "lean"
  const lightEff = eff * 0.90;
  const lightHalf = lightEff * 0.5;

  g.save();
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = Math.max(0, Math.min(1, alpha.light));
  g.fillStyle = colors.light;
  g.fillRect(x, (y + lag) - lightHalf, w, lightEff);

  // edge feathers
  g.globalAlpha *= 0.6;
  g.fillRect(x, (y + lag) - lightHalf - feather, w, feather);
  g.fillRect(x, (y + lag) + lightHalf,           w, feather);
  g.restore();
}
