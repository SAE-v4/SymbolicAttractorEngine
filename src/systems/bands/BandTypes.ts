// Shared types for bands

export type Phase = "inhale" | "pause" | "exhale";
export type LensKey = "observatory" | "witness" | "metabolic" | "garden";

export type BreathSample = {
  value: number;   // 0..1 within phase (may be noisy; renderer can ignore)
  phase: Phase;
  bpm: number;     // breaths per minute (tempo hint)
};

// Parameters the shader needs for the grayscale look
export interface BandPreset {
  bandFreq: number;
  bandTilt: number;
  bandSoft: number;
  bandAlpha: number;
  gradeTop: number;
  gradeBot: number;
  gamma: number;
  vignette: number;
}

// How a shader variant declares + binds its uniforms.
// Keep it simple: a fixed uniform list and a bind() that sets values.
export interface ShaderProfile {
  name: string;                        // e.g. "observatory"
  uniforms: readonly string[];         // must match frag.glsl
  bind(
    gl: WebGL2RenderingContext,
    u: Record<string, WebGLUniformLocation | null>,
    preset: BandPreset,
    extras: { scroll: number; size?: { w: number; h: number } }
  ): void;
}
