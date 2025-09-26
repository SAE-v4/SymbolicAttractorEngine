// Minimal OKLCH helpers + conversion to linear sRGB (0..1)
export type OKLCH = { l: number; c: number; h: number }; // L∈[0..1], C∈[0..~0.4], h∈degrees

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const hueWrap = (h: number) => ((h % 360) + 360) % 360;

export function mix(a: number, b: number, t: number) { return a + (b - a) * t; }
export function mixHue(aDeg: number, bDeg: number, t: number) {
  const a = hueWrap(aDeg), b = hueWrap(bDeg);
  const d = (((b - a + 540) % 360) - 180);
  return hueWrap(a + d * t);
}

// OKLCH -> OKLab
export function oklchToOklab({ l, c, h }: OKLCH) {
  const hr = (h * Math.PI) / 180;
  return { L: l, a: c * Math.cos(hr), b: c * Math.sin(hr) };
}

// OKLab -> linear sRGB (Björn Ottosson)
export function oklabToLinearSRGB({ L, a, b }: { L: number; a: number; b: number }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b2 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return { r: clamp01(r), g: clamp01(g), b: clamp01(b2) };
}

// OKLCH -> linear sRGB
export function oklchToLinearSRGB(x: OKLCH) { return oklabToLinearSRGB(oklchToOklab(x)); }

// Linear → sRGB (for 2D Canvas fallback if needed)
export function linearToSRGB1(v: number) { return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1/2.4) - 0.055; }
export function linearToSRGB3({ r, g, b }: { r: number; g: number; b: number }) {
  return [linearToSRGB1(r), linearToSRGB1(g), linearToSRGB1(b)] as [number,number,number];
}

// CSS oklch() string
export function cssOKLCH({ l, c, h }: OKLCH) { return `oklch(${(l*100).toFixed(4)}% ${c.toFixed(4)} ${h.toFixed(2)})`; }
