#version 300 es
precision highp float;
in vec2 v_uv; out vec4 fragColor;

uniform float u_scroll;
uniform float u_bandFreq, u_bandTilt, u_bandSoft, u_bandAlpha;
uniform float u_gradeTop, u_gradeBot, u_gamma, u_vignette;

/* NEW: optional Witness-style accents + slow day drift */
uniform float u_curvature;                  // 0..~0.3; 0 = off
uniform vec2  u_center;                     // usually vec2(0.5, 0.5)

uniform float u_phaseY;                     // 0..1 band center
uniform float u_phaseWidth, u_phaseSoft;    // band thickness/feather
uniform float u_phaseAlpha, u_phaseAmt;     // brightness strength * envelope

uniform float u_dayLumDrift;                // -0.05..+0.05 (slow day macro)
uniform float u_dayVignetteDrift;           // -0.08..+0.08
uniform float u_gammaDrift;                 // -0.10..+0.10

float vign(vec2 uv, float v){
  if (v <= 0.) return 1.;
  float r = distance(uv, vec2(0.5)) / distance(vec2(0.0), vec2(0.5));
  return 1.0 - v * smoothstep(0.6, 1.0, r);
}

void main(){
  vec2 uv = v_uv;
  float y = uv.y, x = uv.x;

  // --- grade baseline (grayscale ramp) ---
  float grade = mix(u_gradeTop, u_gradeBot, y);

  // --- OPTIONAL curvature (Pause accent) ---
  // Small quadratic warp around center; no cost when u_curvature==0.
  float dx = x - u_center.x;
  float dy = y - u_center.y;
  float r2 = dx*dx + dy*dy;
  float yWarp = y - u_curvature * (r2 - 0.25); // 0.25 centers the cup near mid-frame

  // --- Horizontal bands with small tilt + continuous drift ---
  float U = yWarp + u_bandTilt * (x - 0.5) + u_scroll;

  // DPI-stable AA using fwidth (optional but recommended)
  float arg = U * u_bandFreq * 6.28318530718;
  float w = max(u_bandSoft, fwidth(arg));
  float band = smoothstep(-w, w, cos(arg));

  float bandLum = mix(0.18, 0.80, band);
  float lum = mix(grade, bandLum, clamp(u_bandAlpha, 0.0, 1.0));

  // --- OPTIONAL phase stripe overlay (Pause accent) ---
  // Brighten a thin horizontal band (same params as witness)
  float d = abs(y - u_phaseY);
  float m = 1.0 - smoothstep(u_phaseWidth, u_phaseWidth + u_phaseSoft, d);
  float phaseAlpha = clamp(u_phaseAlpha * u_phaseAmt, 0.0, 1.0);
  lum = mix(lum, 1.0, phaseAlpha * m);  // pull towards bright value

  // --- OPTIONAL slow day drift on luminance/vignette/gamma ---
  lum += u_dayLumDrift;                                       // tiny lift/fall
  float vignette = clamp(u_vignette + u_dayVignetteDrift, 0.0, 1.0);
  lum *= vign(uv, vignette);

  float gamma = max(u_gamma + u_gammaDrift, 1e-3);
  lum = pow(clamp(lum, 0.0, 1.0), 1.0 / gamma);

  fragColor = vec4(vec3(lum), 1.0);
}
