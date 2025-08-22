import vertSrc from './shaders/sky.vert?raw';
import fragSrc from './shaders/sky.frag?raw';


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

  gl.uniform1i(this.u_debugMode!, this.debugMode);
  

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
