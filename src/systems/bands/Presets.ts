import type { BandPreset, ShaderProfile, LensKey } from "./BandTypes";

// ——— CURRENT LOOK (Observatory) ———
export const PRESETS: Record<LensKey, BandPreset> = {
  observatory: { bandFreq: 5.8, bandTilt: -0.03, bandSoft: 0.26, bandAlpha: 0.48, gradeTop: 0.10, gradeBot: 0.28, gamma: 1.20, vignette: 0.12 },
  witness:     { bandFreq: 5.8, bandTilt: -0.01, bandSoft: 0.34, bandAlpha: 0.42, gradeTop: 0.12, gradeBot: 0.22, gamma: 1.15, vignette: 0.16 },
  metabolic:   { bandFreq: 5.1, bandTilt:  0.02, bandSoft: 0.24, bandAlpha: 0.60, gradeTop: 0.14, gradeBot: 0.30, gamma: 1.10, vignette: 0.10 },
  garden:      { bandFreq: 5.9, bandTilt:  0.08, bandSoft: 0.28, bandAlpha: 0.50, gradeTop: 0.12, gradeBot: 0.26, gamma: 1.20, vignette: 0.10 },
};

const L = (a:number,b:number,t:number)=>a+(b-a)*t;

export function lerpPreset(a: BandPreset, b: BandPreset, t: number): BandPreset {
  t = Math.min(1, Math.max(0, t));
  return {
    bandFreq:  L(a.bandFreq,  b.bandFreq,  t),
    bandTilt:  L(a.bandTilt,  b.bandTilt,  t),
    bandSoft:  L(a.bandSoft,  b.bandSoft,  t),
    bandAlpha: L(a.bandAlpha, b.bandAlpha, t),
    gradeTop:  L(a.gradeTop,  b.gradeTop,  t),
    gradeBot:  L(a.gradeBot,  b.gradeBot,  t),
    gamma:     L(a.gamma,     b.gamma,     t),
    vignette:  L(a.vignette,  b.vignette,  t),
  };
}
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
    if (u.u_scroll)     gl.uniform1f(u.u_scroll, scroll);
    if (u.u_bandFreq)   gl.uniform1f(u.u_bandFreq, preset.bandFreq);
    if (u.u_bandTilt)   gl.uniform1f(u.u_bandTilt, preset.bandTilt);
    if (u.u_bandSoft)   gl.uniform1f(u.u_bandSoft, preset.bandSoft);
    if (u.u_bandAlpha)  gl.uniform1f(u.u_bandAlpha, preset.bandAlpha);
    if (u.u_gradeTop)   gl.uniform1f(u.u_gradeTop, preset.gradeTop);
    if (u.u_gradeBot)   gl.uniform1f(u.u_gradeBot, preset.gradeBot);
    if (u.u_gamma)      gl.uniform1f(u.u_gamma, preset.gamma);
    if (u.u_vignette)   gl.uniform1f(u.u_vignette, preset.vignette);
    if (u.u_resolution && size) gl.uniform2f(u.u_resolution, size.w, size.h);
  },
};
