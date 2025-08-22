precision mediump float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_breath01;
uniform float u_breathSS;
uniform float u_velocity;

// colors
uniform vec3 u_skyTop;
uniform vec3 u_skyBot;
uniform vec3 u_bandColor;
uniform vec3 u_haloColor;
uniform vec3 u_ringColor;

uniform vec2  u_ringCenterPx;  // ring center in PIXELS (GL canvas space)
uniform float u_ringRadiusPx;  // ring radius in PIXELS
uniform float u_inhale;        // 0..1 (same as breath01 is fine)
uniform float u_beat;          // 0..1 short decay on beat
uniform vec3  u_coreWarm;      // e.g. vec3(1.0, 0.96, 0.86)

// params
uniform float u_bandAlphaBase;
uniform float u_bandAlphaGain;
uniform float u_bandFreq;
uniform float u_bandDriftBase;
uniform float u_bandDriftGain;

uniform float u_haloIntensityB;
uniform float u_haloIntensityG;
uniform float u_haloGainR;
uniform float u_ringMaxAlpha;
uniform float u_ringGainR;

uniform float u_scroll;

uniform int u_debugMode;   // 0=off, 1=lens, 2=warp mag, 3=ring isolines, 4=gy diff

float softstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

void main() {
// --- aspect-corrected UV (origin at center, units = pixels of minDim) ---
vec2 fc = gl_FragCoord.xy;
vec2 centered = fc - 0.5 * u_res;
float minDim = min(u_res.x, u_res.y);
vec2 uv = centered / minDim;  

// ring center/radius in the same uv space
vec2 ringUV = (u_ringCenterPx - 0.5 * u_res) / minDim;
float ringR  = u_ringRadiusPx / minDim;

// --- tiny radial lens warp around the ring ---
// distance from ring center in uv units (minDim pixels)
vec2  d     = uv - ringUV;
float dist  = length(d) + 1e-6;
vec2  n     = d / dist;


// Gaussian around the ring radius (narrower than before)
float sigma = ringR * 0.44;                   // was 0.55
float lens  = exp(-pow((dist - ringR) / sigma, 2.0));

// make it strong enough to see (you can dial down later)
// strength of lens displacement
float warpStrength =
    0.006 * u_inhale
  + 0.003 * abs(u_breathSS)
  + 0.0015 * abs(u_velocity);

warpStrength = clamp(warpStrength, 0.0, 0.012);  // safety clamp

// anisotropic lens (bend horizontal bands more)
vec2 anis = vec2(0.35, 1.0);

// tangential unit (perpendicular to n)
vec2 t = vec2(-n.y, n.x);

// how much to curl around the ring (start at ~60% of radial strength)
float curl = 0.4 * warpStrength;
// optional: give inhale/exhale opposite swirl — uncomment to try
// curl *= sign(u_breathSS);

// combine: radial magnification + tangential curl
vec2 uvWarp = uv
  + (n * anis) * warpStrength * lens   // radial (normal) push
  +  t          * curl        * lens;  // tangential (curl) push


// radial distances (after lens warp)
float rCenter = length(uvWarp);          // distance from screen center
float rRing   = length(uvWarp - ringUV); // distance from ring center (optional)


// Convert warped uv back to a [0..1] vertical coord for bands
float gyWarp = (uvWarp.y * minDim + 0.5 * u_res.y) / u_res.y;

  // Sky gradient
  vec3 Lsky = mix(u_skyBot, u_skyTop, gyWarp);

// --- Light-band thickness breathing (duty-cycle), with drift + reversal ---
float baseSpeed   = u_bandDriftBase;
float breathSpeed = u_bandDriftGain * u_breathSS; // reverses on inhale/exhale
float cycles = gyWarp * u_bandFreq + u_scroll;

// periodic position 0..1 within a band
float x = fract(cycles);

// how much of each period is the LIGHT band (0..1)
float duty = mix(0.35, 0.15, u_breath01);

// anti-aliased edge width (keep your soft constant—mobile friendly)
float aa = 0.100;
float lightRect = smoothstep(0.0, aa, x) * (1.0 - smoothstep(duty, duty + aa, x));

// optional softening
float soften = 0.65;
float bandsField = mix(lightRect, 0.5 + 0.5 * sin(cycles * 6.2831853), soften);

// overall band opacity (breath)
float Abands = clamp(u_bandAlphaBase + u_bandAlphaGain * u_breath01, 0.0, 0.8);


// final contribution
vec3 Lbands = u_bandColor * Abands * bandsField;
float bandGlow = 0.10 * lens;
Lbands += u_bandColor * bandGlow * (0.4 + 0.6*u_inhale);

float r = rCenter;

  // Radial halo
  float halo = exp(-r * 3.0) * (u_haloIntensityB + u_haloIntensityG * u_breath01);
  halo += u_haloGainR * max(u_velocity, 0.0);
  vec3 Lhalo = u_haloColor * halo;

  // Expanding ring
  float ring = exp(-abs(r - (0.2 + 0.3 * u_breath01)) * 20.0);
  float ringAlpha = u_ringMaxAlpha * (0.6 + 0.4 * u_breath01);
  ring += u_ringGainR * max(u_velocity, 0.0);
  vec3 Lring = u_ringColor * ring * ringAlpha;

  // Warm core carry (subtle GL contribution that blends with 2D core)
float coreMask = exp(-pow(dist / (ringR * 0.65), 2.0));
float coreGain = 0.10 + 0.20 * u_inhale + 0.35 * u_beat; // tunable
vec3 Lcore = u_coreWarm * coreMask * coreGain;

  // Combine
vec3 col = Lsky + Lbands + Lhalo + Lring + Lcore;

// --- Debug overlays ---
if (u_debugMode == 1) {
  // lens heatmap
  float v = clamp(lens, 0.0, 1.0);
  vec3 tint = mix(vec3(0.0,0.15,0.50), vec3(1.0,0.95,0.25), v);
  col = mix(col, tint, 0.35);
} else if (u_debugMode == 2) {
  // warp magnitude (how far uv moved)
  float mag = length(uvWarp - uv) * minDim * 120.0;   // amplify for visibility
  float v = smoothstep(0.0, 1.0, mag);
  vec3 tint = mix(vec3(0.0,0.2,0.0), vec3(0.0,1.0,0.6), v);
  col = mix(col, tint, 0.5);
} else if (u_debugMode == 3) {
  // ring-centered isolines (distance bands)
  float k = 32.0;
  float bands = 0.5 + 0.5 * sin((dist - ringR) * k);
  vec3 tint = mix(vec3(0.1,0.1,0.1), vec3(0.9,0.9,0.9), bands);
  col = mix(col, tint, 0.35);
} else if (u_debugMode == 4) {
  // gy vs gyWarp difference (what the lens does to the band sampler)
  float diff = clamp(abs(((uvWarp.y-uv.y)*minDim))*2.0, 0.0, 1.0);
  vec3 tint = mix(vec3(0.1,0.0,0.0), vec3(1.0,0.3,0.3), diff);
  col = mix(col, tint, 0.4);
}



gl_FragColor = vec4(col, 1.0);
}