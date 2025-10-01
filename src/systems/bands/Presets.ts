import type { BandPreset, ShaderProfile, LensKey } from "./BandTypes";

// ——— CURRENT LOOK (Observatory) ———
export const PRESETS: Record<LensKey, BandPreset & {
  // Witness-only extras (safe to keep on the object; other profiles ignore)
  phaseY?: number;       // 0..1 centerline
  phaseWidth?: number;   // half-width (0..1)
  phaseSoft?: number;    // falloff
  phaseAlpha?: number;   // max opacity
  phaseValue?: number;   // luminance of phase band (0..1)
  curvature?: number;    // 0 = straight; >0 adds gentle arc
  centerX?: number;      // curvature center (x)
  centerY?: number;      // curvature center (y)
}> = {
  observatory: {
    bandFreq: 5.8, bandTilt: -0.03, bandSoft: 0.26, bandAlpha: 0.48,
    gradeTop: 0.10, gradeBot: 0.28, gamma: 1.20, vignette: 0.12
  },

  // WITNESS defaults — gentle curvature and a subtle phase band
  witness: {
    bandFreq: 5.8, bandTilt: -0.01, bandSoft: 0.32, bandAlpha: 0.44,
    gradeTop: 0.12, gradeBot: 0.22, gamma: 1.15, vignette: 0.16,
    phaseY: 0.50, phaseWidth: 0.06, phaseSoft: 0.04, phaseAlpha: 0.35, phaseValue: 0.85,
    curvature: 0.08, centerX: 0.5, centerY: 0.5
  },

  // placeholders (unchanged)
  metabolic: { bandFreq: 5.1, bandTilt: 0.02, bandSoft: 0.24, bandAlpha: 0.60, gradeTop: 0.14, gradeBot: 0.30, gamma: 1.10, vignette: 0.10 },
  garden: { bandFreq: 5.9, bandTilt: 0.08, bandSoft: 0.28, bandAlpha: 0.50, gradeTop: 0.12, gradeBot: 0.26, gamma: 1.20, vignette: 0.10 },
};

export const WitnessProfile: ShaderProfile = {
  name: "witness",
  uniforms: [
    "u_scroll",
    "u_bandFreq", "u_bandTilt", "u_bandSoft", "u_bandAlpha",
    "u_gradeTop", "u_gradeBot", "u_gamma", "u_vignette",
    // witness extras:
    "u_phaseY", "u_phaseWidth", "u_phaseSoft", "u_phaseAlpha", "u_phaseValue",
    "u_phaseAmt",
    "u_curvature", "u_center",
    // "u_resolution", // add if your shader uses it
  ] as const,

  bind(gl, u, preset, { scroll, phaseAmt = 0, size }) {
    gl.uniform1f(u.u_scroll!, scroll);

    gl.uniform1f(u.u_bandFreq!, preset.bandFreq);
    gl.uniform1f(u.u_bandTilt!, preset.bandTilt);
    gl.uniform1f(u.u_bandSoft!, preset.bandSoft);
    gl.uniform1f(u.u_bandAlpha!, preset.bandAlpha);

    gl.uniform1f(u.u_gradeTop!, preset.gradeTop);
    gl.uniform1f(u.u_gradeBot!, preset.gradeBot);
    gl.uniform1f(u.u_gamma!, preset.gamma);
    gl.uniform1f(u.u_vignette!, preset.vignette);

    // witness extras (all optional-safe)
    gl.uniform1f(u.u_phaseY!, (preset as any).phaseY ?? 0.5);
    gl.uniform1f(u.u_phaseWidth!, (preset as any).phaseWidth ?? 0.05);
    gl.uniform1f(u.u_phaseSoft!, (preset as any).phaseSoft ?? 0.04);
    gl.uniform1f(u.u_phaseAlpha!, (preset as any).phaseAlpha ?? 0.3);
    gl.uniform1f(u.u_phaseValue!, (preset as any).phaseValue ?? 0.85);
    gl.uniform1f(u.u_phaseAmt!, phaseAmt);

    gl.uniform1f(u.u_curvature!, (preset as any).curvature ?? 0.0);
    gl.uniform2f(u.u_center!, (preset as any).centerX ?? 0.5, (preset as any).centerY ?? 0.5);

    if (u.u_resolution && size) gl.uniform2f(u.u_resolution, size.w, size.h);
  },
};
// Uniform list must match your frag.glsl (observatory-only variant)
export const ObservatoryProfile: ShaderProfile = {
  name: "observatory",
  uniforms: [
    "u_scroll",
    "u_bandFreq", "u_bandTilt", "u_bandSoft", "u_bandAlpha",
    "u_gradeTop", "u_gradeBot", "u_gamma", "u_vignette",
    // If your frag has u_resolution, add it and pass size below.
    // "u_resolution",
  ] as const,
  bind(gl, u, preset, extras) {
    const { scroll, size } = extras;
    if (u.u_scroll) gl.uniform1f(u.u_scroll, scroll);
    if (u.u_bandFreq) gl.uniform1f(u.u_bandFreq, preset.bandFreq);
    if (u.u_bandTilt) gl.uniform1f(u.u_bandTilt, preset.bandTilt);
    if (u.u_bandSoft) gl.uniform1f(u.u_bandSoft, preset.bandSoft);
    if (u.u_bandAlpha) gl.uniform1f(u.u_bandAlpha, preset.bandAlpha);
    if (u.u_gradeTop) gl.uniform1f(u.u_gradeTop, preset.gradeTop);
    if (u.u_gradeBot) gl.uniform1f(u.u_gradeBot, preset.gradeBot);
    if (u.u_gamma) gl.uniform1f(u.u_gamma, preset.gamma);
    if (u.u_vignette) gl.uniform1f(u.u_vignette, preset.vignette);
    if (u.u_resolution && size) gl.uniform2f(u.u_resolution, size.w, size.h);
  },
};

// --- simple scalar lerp ---
const L = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Blend two presets, including optional Witness extras when present.
 * t is clamped to [0,1].
 */
export function lerpPreset<
  T extends BandPreset & {
    phaseY?: number; phaseWidth?: number; phaseSoft?: number;
    phaseAlpha?: number; phaseValue?: number;
    curvature?: number; centerX?: number; centerY?: number;
  }
>(a: T, b: T, t: number): T {
  t = Math.max(0, Math.min(1, t));

  // Base fields (always present)
  const out: any = {
    bandFreq:  L(a.bandFreq,  b.bandFreq,  t),
    bandTilt:  L(a.bandTilt,  b.bandTilt,  t),
    bandSoft:  L(a.bandSoft,  b.bandSoft,  t),
    bandAlpha: L(a.bandAlpha, b.bandAlpha, t),
    gradeTop:  L(a.gradeTop,  b.gradeTop,  t),
    gradeBot:  L(a.gradeBot,  b.gradeBot,  t),
    gamma:     L(a.gamma,     b.gamma,     t),
    vignette:  L(a.vignette,  b.vignette,  t),
  };

  // Optional Witness extras (lerp only if either side defines them)
  const lerpOpt = (k: keyof T) => {
    const av = a[k] as unknown as number | undefined;
    const bv = b[k] as unknown as number | undefined;
    if (av !== undefined || bv !== undefined) {
      const base = av ?? bv ?? 0;          // avoid NaN
      const tgt  = bv ?? av ?? base;
      out[k] = L(base, tgt, t);
    }
  };

  lerpOpt("phaseY");
  lerpOpt("phaseWidth");
  lerpOpt("phaseSoft");
  lerpOpt("phaseAlpha");
  lerpOpt("phaseValue");
  lerpOpt("curvature");
  lerpOpt("centerX");
  lerpOpt("centerY");

  return out as T;
}

