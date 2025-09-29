#version 300 es
precision highp float;
in vec2 v_uv; out vec4 fragColor;

uniform float u_scroll;
uniform float u_bandFreq, u_bandTilt, u_bandSoft, u_bandAlpha;
uniform float u_gradeTop, u_gradeBot, u_gamma, u_vignette;

float sb(float x, float s){ return smoothstep(-s, s, cos(x)); }
float vign(vec2 uv, float v){
  if (v <= 0.) return 1.;
  float r = distance(uv, vec2(0.5)) / distance(vec2(0.0), vec2(0.5));
  return 1.0 - v * smoothstep(0.6, 1.0, r);
}

void main(){
  vec2 uv = v_uv;
  float y = uv.y, x = uv.x;

  float grade = mix(u_gradeTop, u_gradeBot, y);

  // Horizontal bands with small tilt + continuous drift
  float U = y + u_bandTilt * (x - 0.5) + u_scroll;

  // DPI-stable AA using fwidth (optional but recommended)
  float arg = U * u_bandFreq * 6.28318530718;
  float w = max(u_bandSoft, fwidth(arg));
  float band = smoothstep(-w, w, cos(arg));

  float bandLum = mix(0.18, 0.80, band);
  float lum = mix(grade, bandLum, clamp(u_bandAlpha, 0.0, 1.0));

  lum *= vign(uv, u_vignette);
  lum = pow(clamp(lum, 0.0, 1.0), 1.0 / max(u_gamma, 1e-3));
  fragColor = vec4(vec3(lum), 1.0);
}
