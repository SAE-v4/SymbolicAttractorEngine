#version 300 es
precision highp float;
in vec2 v_uv; out vec4 fragColor;

// Base uniforms (same spirit as observatory)
uniform float u_scroll;
uniform float u_bandFreq, u_bandTilt, u_bandSoft, u_bandAlpha;
uniform float u_gradeTop, u_gradeBot, u_gamma, u_vignette;

// Witness-specific
uniform float u_phaseY, u_phaseWidth, u_phaseSoft, u_phaseAlpha, u_phaseValue;
uniform float u_phaseAmt;     // 0..1 (mid-phase energy)
uniform float u_curvature;    // 0=straight; >0 adds gentle bowing
uniform vec2  u_center;       // curvature center

// NEW: slow day drift (same API as observatory)
uniform float u_dayLumDrift;            // -0.05..+0.05
uniform float u_dayVignetteDrift;       // -0.08..+0.08
uniform float u_gammaDrift;             // -0.10..+0.10

float vign(vec2 uv, float v){
  if (v <= 0.) return 1.;
  float r = distance(uv, vec2(0.5)) / distance(vec2(0.0), vec2(0.5));
  return 1.0 - v * smoothstep(0.6, 1.0, r);
}

void main() {
  vec2 uv = v_uv;
  float x = uv.x, y = uv.y;

  // Curvature (consistent with Observatory)
  float dx = x - u_center.x;
  float dy = y - u_center.y;
  float r2 = dx*dx + dy*dy;
  float yWarp = y - u_curvature * (r2 - 0.25);

  // drifted coordinate with small tilt
  float U = yWarp + u_bandTilt * (x - 0.5) + u_scroll;

  // DPI-stable anti-aliased cosine bands
  float arg = U * u_bandFreq * 6.28318530718;
  float w = max(u_bandSoft, fwidth(arg));
  float band = smoothstep(-w, w, cos(arg));

  // Compose luminance
  float grade = mix(u_gradeTop, u_gradeBot, y);
  float bandLum = mix(0.18, 0.80, band);
  float lum = mix(grade, bandLum, clamp(u_bandAlpha, 0.0, 1.0));

  // Phase band overlay (center line that breathes with u_phaseAmt)
  float d = abs(y - u_phaseY);
  float m = 1.0 - smoothstep(u_phaseWidth, u_phaseWidth + u_phaseSoft, d);
  float phaseAlpha = clamp(u_phaseAlpha * u_phaseAmt, 0.0, 1.0);
  lum = mix(lum, u_phaseValue, phaseAlpha * m);

  // Slow day drift (macro)
  lum += u_dayLumDrift;
  float vignette = clamp(u_vignette + u_dayVignetteDrift, 0.0, 1.0);
  lum *= vign(uv, vignette);

  float gamma = max(u_gamma + u_gammaDrift, 1e-3);
  lum = pow(clamp(lum, 0.0, 1.0), 1.0 / gamma);

  fragColor = vec4(vec3(lum), 1.0);
}
