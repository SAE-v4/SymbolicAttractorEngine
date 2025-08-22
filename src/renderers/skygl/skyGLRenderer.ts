//import fragSrc from './shaders/sky.frag'

const fragSrc = `precision mediump float;

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
float sigma = ringR * 0.55;                   // was 0.55
float lens  = exp(-pow((dist - ringR) / sigma, 2.0));

// make it strong enough to see (you can dial down later)
float warpBase = 0.006 * u_inhale + 0.003 * abs(u_breathSS) + 0.0015 * abs(u_velocity);

// anisotropic: bend horizontal bands more => amplify Y component
vec2 anis = vec2(0.35, 1.0);                  // X weaker, Y stronger
vec2 uvWarp = uv + (n * anis) * warpBase * lens;

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
float cycles      = gyWarp * u_bandFreq + (baseSpeed + breathSpeed) * u_time;

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
gl_FragColor = vec4(col, 1.0);
}
`

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
  private u_res: WebGLUniformLocation|null;
  private u_time: WebGLUniformLocation|null;
  private u_b01: WebGLUniformLocation|null;
  private u_bSS: WebGLUniformLocation|null;
  private u_vel: WebGLUniformLocation|null;

  private u_skyTop: WebGLUniformLocation|null;
  private u_skyBot: WebGLUniformLocation|null;
  private u_band: WebGLUniformLocation|null;
  private u_halo: WebGLUniformLocation|null;
  private u_ring: WebGLUniformLocation|null;

  private u_bandFreq: WebGLUniformLocation|null;
  private u_bandAlphaBase: WebGLUniformLocation|null;
  private u_bandAlphaGain: WebGLUniformLocation|null;
  private u_bandDriftBase: WebGLUniformLocation|null;
  private u_bandDriftGain: WebGLUniformLocation|null;

  private u_haloBaseR: WebGLUniformLocation|null;
  private u_haloGainR: WebGLUniformLocation|null;
  private u_haloIntensityB: WebGLUniformLocation|null;
  private u_haloIntensityG: WebGLUniformLocation|null;

  private u_ringBaseR: WebGLUniformLocation|null;
  private u_ringGainR: WebGLUniformLocation|null;
  private u_ringMaxAlpha: WebGLUniformLocation|null;

  private u_debugMode: WebGLUniformLocation | null;
  private debugMode = 0;
  
    // NEW uniform locations
  private u_ringCenterPx: WebGLUniformLocation|null;
  private u_ringRadiusPx: WebGLUniformLocation|null;
  private u_inhaleU: WebGLUniformLocation|null;
  private u_beatU: WebGLUniformLocation|null;
  private u_coreWarm: WebGLUniformLocation|null;


  // State
  private breath01 = 0;
  private breathSS = 0;
  private velocity = 0;
  private colors = {
    skyTop:  [0x0E/255,0x1C/255,0x2A/255],
    skyBot:  [0x24/255,0x3C/255,0x5A/255],
    band:    [0x96/255,0xB4/255,0xFF/255],
    halo:    [0xA9/255,0xC5/255,0xFF/255],
    ring:    [0xC8/255,0xDA/255,0xFF/255],
  };

  // NEW state
  private gateCSS = { cx: 0, cy: 0, r: 0 };           // gate in CSS px
  private coreWarm = [1.0, 0.96, 0.86] as [number,number,number];
  private beat = 0;                                    // 0..1
  private tPrev = 0;                                   // sec

  private params = {
    bandFreq: 6.0,
    bandAlphaBase: 0.05,
    bandAlphaGain: 0.07,
    bandDriftBase: 0.10,
    bandDriftGain: 0.10,
    haloBaseR: 0.55,
    haloGainR: 0.15,
    haloIntensityB: 0.20,
    haloIntensityG: 0.30,
    ringBaseR: 0.55,
    ringGainR: 0.12,
    ringMaxAlpha: 0.25,
  };

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
    
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    gl.disable(gl.DEPTH_TEST);
gl.disable(gl.CULL_FACE);
gl.disable(gl.BLEND);
gl.clearColor(0, 0, 0, 1); 

    

    // Program
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

    // Fullscreen triangle
    this.buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const verts = new Float32Array([
      -1, -1,  3, -1,  -1, 3
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const U = (name:string)=>gl.getUniformLocation(this.prog, name);
    this.u_res = U('u_res');
    this.u_time = U('u_time');
    this.u_b01 = U('u_breath01');
    this.u_bSS = U('u_breathSS');
    this.u_vel = U('u_velocity');

    this.u_skyTop = U('u_skyTop');
  this.u_skyBot = U('u_skyBot');
  this.u_band   = U('u_bandColor');
  this.u_halo   = U('u_haloColor');
  this.u_ring   = U('u_ringColor');


    this.u_bandFreq = U('u_bandFreq');
    this.u_bandAlphaBase = U('u_bandAlphaBase');
    this.u_bandAlphaGain = U('u_bandAlphaGain');
    this.u_bandDriftBase = U('u_bandDriftBase');
    this.u_bandDriftGain = U('u_bandDriftGain');

    this.u_haloBaseR = U('u_haloBaseR');
    this.u_haloGainR = U('u_haloGainR');
    this.u_haloIntensityB = U('u_haloIntensityB');
    this.u_haloIntensityG = U('u_haloIntensityG');

    this.u_ringBaseR = U('u_ringBaseR');
    this.u_ringGainR = U('u_ringGainR');
    this.u_ringMaxAlpha = U('u_ringMaxAlpha');

    this.u_ringCenterPx = U('u_ringCenterPx');
    this.u_ringRadiusPx = U('u_ringRadiusPx');
    this.u_inhaleU      = U('u_inhale');
    this.u_beatU        = U('u_beat');
    this.u_coreWarm     = U('u_coreWarm');

    this.applyColors();
    this.applyParams();
    this.resize();
    window.addEventListener('resize', ()=>this.resize());
    this.u_debugMode = U("u_debugMode");
    // 🔑 Keyboard toggle
  window.addEventListener("keydown", (e) => {
    if (e.key === "m") { // press 'm' to cycle
      this.debugMode = (this.debugMode + 1) % 5;
      console.log("Debug mode:", this.debugMode);
    }
  });
  }

  setBreath(b: { breath01:number; breathSS:number; velocity:number }) {
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

    // Call this from your mount after computeGate()
  setGate(g: { cx:number; cy:number; r:number }) {
    this.gateCSS = g;
  }

  setCoreWarm(rgb: [number,number,number]) {
    this.coreWarm = rgb;
  }

  // Optional: call on beat to pop the GL core a touch
  pulseBeat(strength = 1) {
    this.beat = Math.min(1, this.beat + strength);
  }

render(timeSec: number) {
  
  const gl = this.gl;

  const dt = this.tPrev ? (timeSec - this.tPrev) : 0;
  this.tPrev = timeSec;
  this.beat = Math.max(0, this.beat - 2.5 * dt);

  gl.clear(gl.COLOR_BUFFER_BIT);
 const w = gl.canvas.width;
  const h = gl.canvas.height;

  gl.viewport(0, 0, w, h);
  gl.useProgram(this.prog);

  // existing
  gl.uniform2f(this.u_res, w, h);
  gl.uniform1f(this.u_time, timeSec);
  gl.uniform1f(this.u_b01, this.breath01);
  gl.uniform1f(this.u_bSS, this.breathSS);
  gl.uniform1f(this.u_vel, this.velocity);

  // NEW — ring uniforms
  const dpr = this.canvas.clientWidth ? (this.canvas.width / this.canvas.clientWidth) : 1;
  const cxPx = this.gateCSS.cx * dpr;
  const cyPx = this.gateCSS.cy * dpr;
  const rPx  = this.gateCSS.r  * dpr;

  gl.uniform2f(this.u_ringCenterPx!, cxPx, cyPx);
  gl.uniform1f(this.u_ringRadiusPx!, rPx);
  gl.uniform1f(this.u_inhaleU!, this.breath01); // or another inhale value
  gl.uniform1f(this.u_beatU!, this.beat);
  gl.uniform3f(this.u_coreWarm!, this.coreWarm[0], this.coreWarm[1], this.coreWarm[2]);

  gl.drawArrays(gl.TRIANGLES, 0, 3);

  

  // 🔍 Debug log
  // console.log("u_res", w, h,
  //             "breath01", this.breath01.toFixed(3),
  //             "breathSS", this.breathSS.toFixed(3),
  //             "velocity", this.velocity.toFixed(3));
  gl.drawArrays(gl.TRIANGLES, 0, 3); 
}


  // ---- internals ----
  private compile(type:number, src:string){
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
    gl.uniform3f(this.u_skyTop!, c.skyTop[0], c.skyTop[1], c.skyTop[2]);
    gl.uniform3f(this.u_skyBot!, c.skyBot[0], c.skyBot[1], c.skyBot[2]);
    gl.uniform3f(this.u_band!,   c.band[0],   c.band[1],   c.band[2]);
    gl.uniform3f(this.u_halo!,   c.halo[0],   c.halo[1],   c.halo[2]);
    gl.uniform3f(this.u_ring!,   c.ring[0],   c.ring[1],   c.ring[2]);
  }

  private applyParams() {
    const gl = this.gl;
    const p = this.params;
    gl.useProgram(this.prog);
    gl.uniform1f(this.u_bandFreq!, p.bandFreq);
    gl.uniform1f(this.u_bandAlphaBase!, p.bandAlphaBase);
    gl.uniform1f(this.u_bandAlphaGain!, p.bandAlphaGain);
    gl.uniform1f(this.u_bandDriftBase!, p.bandDriftBase);
    gl.uniform1f(this.u_bandDriftGain!, p.bandDriftGain);

    gl.uniform1f(this.u_haloBaseR!, p.haloBaseR);
    gl.uniform1f(this.u_haloGainR!, p.haloGainR);
    gl.uniform1f(this.u_haloIntensityB!, p.haloIntensityB);
    gl.uniform1f(this.u_haloIntensityG!, p.haloIntensityG);

    gl.uniform1f(this.u_ringBaseR!, p.ringBaseR);
    gl.uniform1f(this.u_ringGainR!, p.ringGainR);
    gl.uniform1f(this.u_ringMaxAlpha!, p.ringMaxAlpha);
    
  }

  private resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(this.canvas.clientWidth  * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
  }

}
