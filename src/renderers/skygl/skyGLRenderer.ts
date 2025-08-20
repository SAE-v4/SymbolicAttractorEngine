//import fragSrc from './shaders/sky.frag'

// sRGB (0..1) -> linear sRGB (0..1)
function srgbToLinear1(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function srgbToLinear3(v: [number, number, number]): [number, number, number] {
  return [srgbToLinear1(v[0]), srgbToLinear1(v[1]), srgbToLinear1(v[2])];
}

type OKLCH = { l:number; c:number; h:number }; // l:0..1
const wrap = (h:number)=>((h%360)+360)%360;
const lerp = (a:number,b:number,t:number)=>a+(b-a)*t;
const lerpHue = (h1:number,h2:number,t:number)=>{
  const d = (((h2-h1+540)%360)-180); return wrap(h1 + d*t);
};
function mixOKLCH(a:OKLCH,b:OKLCH,t:number):OKLCH{
  return { l: lerp(a.l,b.l,t), c: lerp(a.c,b.c,t), h: lerpHue(a.h,b.h,t) };
}
function oklchToLinearSRGB(o:OKLCH){
  const hr = o.h*Math.PI/180, a = o.c*Math.cos(hr), b = o.c*Math.sin(hr);
  const L=o.l;
  const l_ = L + 0.3963377774*a + 0.2158037573*b;
  const m_ = L - 0.1055613458*a - 0.0638541728*b;
  const s_ = L - 0.0894841775*a - 1.2914855480*b;
  const l3=l_*l_*l_, m3=m_*m_*m_, s3=s_*s_*s_;
  return {
    r:  4.0767416621*l3 - 3.3077115913*m3 + 0.2309699292*s3,
    g: -1.2684380046*l3 + 2.6097574011*m3 - 0.3413193965*s3,
    b: -0.0041960863*l3 - 0.7034186147*m3 + 1.7076147010*s3,
  };
}

const DAWN_TOP: OKLCH = { l:0.52, c:0.045, h:232 };
const DAWN_BOT: OKLCH = { l:0.44, c:0.040, h:228 };
const SEPT_TOP: OKLCH = { l:0.62, c:0.070, h:244 };
const SEPT_BOT: OKLCH = { l:0.50, c:0.055, h:238 };


const fragSrc = `precision mediump float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_breath01;
uniform float u_breathSS;
uniform float u_velocity;

// helpers
vec3 linearToSRGB(vec3 x){
  vec3 a = 12.92 * x;
  vec3 b = 1.055 * pow(x, vec3(1.0/2.4)) - 0.055;
  return mix(a, b, step(vec3(0.0031308), x));
}

vec3 saturateVec(vec3 x){ return clamp(x, 0.0, 1.0); }

// colors
uniform vec3 u_skyTop;
uniform vec3 u_skyBot;
uniform vec3 u_bandColor;
uniform vec3 u_haloColor;
uniform vec3 u_ringColor;

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

uniform float u_yGamma;        // vertical curve (>1 darkens top/bottom)
uniform float u_gradeLift;     // subtract before gain (0..0.08)
uniform float u_gradeSat;      // saturation multiplier (1..1.3)
uniform float u_vignette;      // 0..0.35 edge darken

float softstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

void main() {
  // --- aspect-ratio corrected UV ---
  vec2 centered = gl_FragCoord.xy - 0.5 * u_res; 
  float minDim = min(u_res.x, u_res.y);
  vec2 uv = centered / minDim; 
  float r = length(uv);
float gy = gl_FragCoord.y / u_res.y;

float gyCurve = pow(gy, max(0.5, u_yGamma));   // >1 = darker overall (esp. top)
vec3 Lsky = mix(u_skyBot, u_skyTop, gyCurve);

// --- Light-band thickness breathing (duty-cycle), with drift + reversal

// cycles that move with time (base drift) and reverse on inhale/exhale
float baseSpeed    = u_bandDriftBase;             // e.g. 0.10
float breathSpeed  = u_bandDriftGain * u_breathSS; // reverses direction
float cycles       = gy * u_bandFreq + (baseSpeed + breathSpeed) * u_time;

cycles += 0.15 * uv.x;

// periodic position 0..1 within a band
float x = fract(cycles);

// how much of each period is the LIGHT band (0..1)
// breath01 near 0  -> thin light band / thick dark band
// breath01 near 1  -> thick light band / thin dark band
//float duty = mix(0.35, 0.15, u_breath01);   // tweak range to taste
float duty = mix(0.28, 0.52, u_breath01);

// anti-aliased edge width (so changing thickness stays smooth)
//float aa   = max(fwidth(x), 0.004);         // needs mediump precision, OK on mobile
float aa = 0.100;   // adjust to taste, larger = softer band edges
// rectangular window: 1 inside [0..duty], 0 outside, with soft edges
float lightRect = smoothstep(0.0, aa, x) * (1.0 - smoothstep(duty, duty + aa, x));

// optional softening so it isn't perfectly rectangular (looks nicer)
float soften = 0.82;                         // 0 = hard bars, 1 = sine-like
float bandsField = mix(lightRect, 0.5 + 0.5 * sin(cycles * 6.2831853), soften);

// opacity breath (how visible bands are overall)
float Abands = clamp(u_bandAlphaBase + u_bandAlphaGain * u_breath01, 0.0, 0.8);

// final contribution
vec3 Lbands = u_bandColor * Abands * bandsField;



  // Radial halo
  float halo = exp(-r * 3.0) * (u_haloIntensityB + u_haloIntensityG * u_breath01);
  halo += u_haloGainR * max(u_velocity, 0.0);
  vec3 Lhalo = u_haloColor * halo;

  // Expanding ring
  float ring = exp(-abs(r - (0.2 + 0.3 * u_breath01)) * 20.0);
  float ringAlpha = u_ringMaxAlpha * (0.6 + 0.4 * u_breath01);
  ring += u_ringGainR * max(u_velocity, 0.0);
  vec3 Lring = u_ringColor * ring * ringAlpha;

  // Combine
  vec3 col = Lsky + Lbands + Lhalo + Lring;
  // --- quick “pop” adjustments in linear space ---
  // 1) contrast curve around mid-grey (≈0.18 linear)
 // float contrast = 1.10; // 1.0=none
 // col = (col - 0.18) * contrast + 0.18;

  // 2) gentle saturation boost (convert using Rec.709 luminance)
  // float sat = 1.18;      // 1.0=none
  // float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // col = mix(vec3(lum), col, sat);

  // 3) clamp & encode to sRGB for the browser compositor
  // --- evening grade in linear space ---
float lift = u_gradeLift;           // e.g. 0.035
col = max(col - lift, 0.0);

// gentle contrast around pivot
 float contrast = 1.08;
col = (col - 0.18) * contrast + 0.18;

// saturation
float sat = u_gradeSat;             // e.g. 1.15
float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
col = mix(vec3(lum), col, sat);

// vignette (radial, linear)
float vig = 1.0 - u_vignette * pow(r, 1.3);  // e.g. u_vignette = 0.18
col *= vig;

// clamp & encode
col = saturateVec(col);
col = linearToSRGB(col);

  gl_FragColor = vec4(col, 1.0);
}
`;

const vertSrc = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = (a_pos * 0.5) + 0.5;
  gl_Position = vec4(a_pos, 0., 1.);
}
`;


type GL = WebGLRenderingContext;

export class SkyGLRenderer {
  private gl: GL;
  private prog: WebGLProgram;
  private buf: WebGLBuffer;

  // Uniform locations
  private u_res: WebGLUniformLocation | null;
  private u_time: WebGLUniformLocation | null;
  private u_b01: WebGLUniformLocation | null;
  private u_bSS: WebGLUniformLocation | null;
  private u_vel: WebGLUniformLocation | null;

  private u_skyTop: WebGLUniformLocation | null;
  private u_skyBot: WebGLUniformLocation | null;
  private u_band: WebGLUniformLocation | null;
  private u_halo: WebGLUniformLocation | null;
  private u_ring: WebGLUniformLocation | null;

  private u_bandFreq: WebGLUniformLocation | null;
  private u_bandAlphaBase: WebGLUniformLocation | null;
  private u_bandAlphaGain: WebGLUniformLocation | null;
  private u_bandDriftBase: WebGLUniformLocation | null;
  private u_bandDriftGain: WebGLUniformLocation | null;

  private u_haloBaseR: WebGLUniformLocation | null;
  private u_haloGainR: WebGLUniformLocation | null;
  private u_haloIntensityB: WebGLUniformLocation | null;
  private u_haloIntensityG: WebGLUniformLocation | null;

  private u_ringBaseR: WebGLUniformLocation | null;
  private u_ringGainR: WebGLUniformLocation | null;
  private u_ringMaxAlpha: WebGLUniformLocation | null;

  private u_debugMode: WebGLUniformLocation | null;

  // NEW grade uniform locations
  private u_yGamma: WebGLUniformLocation | null;
  private u_gradeLift: WebGLUniformLocation | null;
  private u_gradeSat: WebGLUniformLocation | null;
  private u_vignette: WebGLUniformLocation | null;

  // NEW grade defaults (“evening” look)
  private grade = {
    yGamma: 1.25,
    gradeLift: 0.035,
    gradeSat: 1.15,
    vignette: 0.18,
  };
  private debugMode = 0;

  // State
  private breath01 = 0;
  private breathSS = 0;
  private velocity = 0;
  private colors = {
    skyTop: [0x0e / 255, 0x1c / 255, 0x2a / 255],
    skyBot: [0x24 / 255, 0x3c / 255, 0x5a / 255],
    band: [0x96 / 255, 0xb4 / 255, 0xff / 255],
    halo: [0xa9 / 255, 0xc5 / 255, 0xff / 255],
    ring: [0xc8 / 255, 0xda / 255, 0xff / 255],
  };

  private params = {
    bandFreq: 6.0,
    bandAlphaBase: 0.05,
    bandAlphaGain: 0.07,
    bandDriftBase: 0.1,
    bandDriftGain: 0.1,
    haloBaseR: 0.55,
    haloGainR: 0.15,
    haloIntensityB: 0.2,
    haloIntensityG: 0.3,
    ringBaseR: 0.55,
    ringGainR: 0.12,
    ringMaxAlpha: 0.25,
  };

constructor(private canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true });
  if (!gl) throw new Error("WebGL not supported");
  this.gl = gl;

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 1);

  // 1) Compile & link
  const vs = this.compile(gl.VERTEX_SHADER, vertSrc);
  const fs = this.compile(gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(String(gl.getProgramInfoLog(prog)));
  }
  this.prog = prog;
  gl.useProgram(this.prog);

  // 2) Fullscreen triangle
  this.buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(this.prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // 3) Uniform locations
  const U = (name: string) => gl.getUniformLocation(this.prog, name);
  this.u_res = U("u_res");
  this.u_time = U("u_time");
  this.u_b01 = U("u_breath01");
  this.u_bSS = U("u_breathSS");
  this.u_vel = U("u_velocity");

  this.u_skyTop = U("u_skyTop");
  this.u_skyBot = U("u_skyBot");
  this.u_band   = U("u_bandColor");
  this.u_halo   = U("u_haloColor");
  this.u_ring   = U("u_ringColor");

  this.u_bandFreq      = U("u_bandFreq");
  this.u_bandAlphaBase = U("u_bandAlphaBase");
  this.u_bandAlphaGain = U("u_bandAlphaGain");
  this.u_bandDriftBase = U("u_bandDriftBase");
  this.u_bandDriftGain = U("u_bandDriftGain");

  this.u_haloBaseR      = U("u_haloBaseR");
  this.u_haloGainR      = U("u_haloGainR");
  this.u_haloIntensityB = U("u_haloIntensityB");
  this.u_haloIntensityG = U("u_haloIntensityG");

  this.u_ringBaseR   = U("u_ringBaseR");
  this.u_ringGainR   = U("u_ringGainR");
  this.u_ringMaxAlpha= U("u_ringMaxAlpha");

  this.u_yGamma    = U("u_yGamma");
  this.u_gradeLift = U("u_gradeLift");
  this.u_gradeSat  = U("u_gradeSat");
  this.u_vignette  = U("u_vignette");

  // 4) Evening defaults (sRGB here; converted to linear in applyColors())
  this.colors = {
    skyTop: [26/255, 54/255, 86/255],
    skyBot: [ 8/255, 23/255, 40/255],
    band:   [164/255,198/255,255/255],
    halo:   [190/255,214/255,255/255],
    ring:   [220/255,234/255,255/255],
  };
  this.grade = { yGamma: 1.25, gradeLift: 0.035, gradeSat: 1.15, vignette: 0.18 };

  // 5) Push defaults once (now that program & locations exist)
  this.applyColors();
  this.applyParams();
  this.applyGrade();

  // 6) Resize + listeners
  this.resize();
  window.addEventListener("resize", () => this.resize());

  // (optional) debug key
  this.u_debugMode = U("u_debugMode");
  window.addEventListener("keydown", (e) => {
    if (e.key === "m") {
      this.debugMode = (this.debugMode + 1) % 5;
      console.log("Debug mode:", this.debugMode);
    }
  });
}


  setBreath(b: { breath01: number; breathSS: number; velocity: number }) {
    this.breath01 = b.breath01;
    this.breathSS = b.breathSS;
    this.velocity = b.velocity;
  }

  setColors(p: Partial<typeof this.colors>) {
    Object.assign(this.colors, p);
    this.applyColors();
  }

  setParams(p: Partial<typeof this.params>) {
    Object.assign(this.params, p);
    this.applyParams();
  }

  render(timeSec: number) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    const w = gl.canvas.width;
    const h = gl.canvas.height;

    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);

    gl.uniform2f(this.u_res, w, h);
    gl.uniform1f(this.u_time, timeSec);
    gl.uniform1f(this.u_b01, this.breath01);
    gl.uniform1f(this.u_bSS, this.breathSS);
    gl.uniform1f(this.u_vel, this.velocity);

    // 🔍 Debug log
    // console.log("u_res", w, h,
    //             "breath01", this.breath01.toFixed(3),
    //             "breathSS", this.breathSS.toFixed(3),
    //             "velocity", this.velocity.toFixed(3));

    // hue/chroma ease (feels nice slightly biased to inhale)
const t = Math.pow(this.breath01, 0.75);
const topLin = oklchToLinearSRGB(mixOKLCH(DAWN_TOP, SEPT_TOP, t));
const botLin = oklchToLinearSRGB(mixOKLCH(DAWN_BOT, SEPT_BOT, t));
if (this.u_skyTop) gl.uniform3f(this.u_skyTop, topLin.r, topLin.g, topLin.b);
if (this.u_skyBot) gl.uniform3f(this.u_skyBot, botLin.r, botLin.g, botLin.b);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---- internals ----
  private compile(type: number, src: string) {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(String(gl.getShaderInfoLog(sh)));
    }
    return sh;
  }

  private applyColors() {
    const gl = this.gl;
    const c = this.colors;
    gl.useProgram(this.prog);

    const skyTopLin = srgbToLinear3([c.skyTop[0], c.skyTop[1], c.skyTop[2]]);
    const skyBotLin = srgbToLinear3([c.skyBot[0], c.skyBot[1], c.skyBot[2]]);
    const bandLin = srgbToLinear3([c.band[0], c.band[1], c.band[2]]);
    const haloLin = srgbToLinear3([c.halo[0], c.halo[1], c.halo[2]]);
    const ringLin = srgbToLinear3([c.ring[0], c.ring[1], c.ring[2]]);

    if (this.u_skyTop)
      gl.uniform3f(this.u_skyTop, skyTopLin[0], skyTopLin[1], skyTopLin[2]);
    if (this.u_skyBot)
      gl.uniform3f(this.u_skyBot, skyBotLin[0], skyBotLin[1], skyBotLin[2]);
    if (this.u_band)
      gl.uniform3f(this.u_band, bandLin[0], bandLin[1], bandLin[2]);
    if (this.u_halo)
      gl.uniform3f(this.u_halo, haloLin[0], haloLin[1], haloLin[2]);
    if (this.u_ring)
      gl.uniform3f(this.u_ring, ringLin[0], ringLin[1], ringLin[2]);
  }

  private applyParams() {
    const gl = this.gl;
    const p = this.params;
    gl.useProgram(this.prog);

    if (this.u_bandFreq) gl.uniform1f(this.u_bandFreq, p.bandFreq);
    if (this.u_bandAlphaBase)
      gl.uniform1f(this.u_bandAlphaBase, p.bandAlphaBase);
    if (this.u_bandAlphaGain)
      gl.uniform1f(this.u_bandAlphaGain, p.bandAlphaGain);
    if (this.u_bandDriftBase)
      gl.uniform1f(this.u_bandDriftBase, p.bandDriftBase);
    if (this.u_bandDriftGain)
      gl.uniform1f(this.u_bandDriftGain, p.bandDriftGain);

    if (this.u_haloIntensityB)
      gl.uniform1f(this.u_haloIntensityB, p.haloIntensityB);
    if (this.u_haloIntensityG)
      gl.uniform1f(this.u_haloIntensityG, p.haloIntensityG);
    if (this.u_haloGainR) gl.uniform1f(this.u_haloGainR, p.haloGainR);

    if (this.u_ringMaxAlpha) gl.uniform1f(this.u_ringMaxAlpha, p.ringMaxAlpha);

    // These two are *not* in your GLSL anymore—keep guards or delete fields entirely
    if (this.u_haloBaseR) gl.uniform1f(this.u_haloBaseR, p.haloBaseR);
    if (this.u_ringBaseR) gl.uniform1f(this.u_ringBaseR, p.ringBaseR);
  }

  private applyGrade() {
    const gl = this.gl;
    gl.useProgram(this.prog);
    // Guard null locations (in case you change the shader later)
    if (this.u_yGamma) gl.uniform1f(this.u_yGamma, this.grade.yGamma);
    if (this.u_gradeLift) gl.uniform1f(this.u_gradeLift, this.grade.gradeLift);
    if (this.u_gradeSat) gl.uniform1f(this.u_gradeSat, this.grade.gradeSat);
    if (this.u_vignette) gl.uniform1f(this.u_vignette, this.grade.vignette);
  }

  private resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  setGrade(p: Partial<typeof this.grade>) {
    Object.assign(this.grade, p);
    this.applyGrade();
  }
}
