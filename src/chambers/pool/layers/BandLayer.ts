// Minimal grayscale breathing bands — WebGL2 (Observatory only).
// API: mount(shadowRoot), resize(cssW, cssH, dpr), setBreath(b), update(dt), draw()

import FS from "@systems/bands/shaders/frag.glsl?raw";

export type BreathSample = { value: number; phase: "inhale" | "pause" | "exhale"; bpm: number };

const VS = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = (gl_VertexID == 0) ? vec2(-1.0, -1.0)
         : (gl_VertexID == 1) ? vec2( 3.0, -1.0)
                              : vec2(-1.0,  3.0);
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`.trim();

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(err || "shader compile");
  }
  return sh;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const err = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(err || "program link");
  }
  return p;
}

export class BandLayer {
  private canvas!: HTMLCanvasElement;
  private gl!: WebGL2RenderingContext;
  private prog!: WebGLProgram;
  private u: Record<string, WebGLUniformLocation> = {};
  private pxW = 1;
  private pxH = 1;

  // Breath / dynamics
  private breath: BreathSample = { value: 0.5, phase: "pause", bpm: 6 };
  private prevPhase: BreathSample["phase"] = "pause";
  private speed = 0;   // screen-heights per second
  private scroll = 0;  // accumulated position (mod one band period)

  // Observatory preset (grayscale)
  private P = {
    bandFreq: 5.8,
    bandTilt: -0.03,
    bandSoft: 0.26,
    bandAlpha: 0.48,
    gradeTop: 0.10,
    gradeBot: 0.28,
    gamma: 1.20,
    vignette: 0.12,
  } as const;

  private phaseTime = 0;           // already in your integrated mode
  private phaseDurHint = 0;        // already computed in update()
  private pInt = 0;

  mount(root: ShadowRoot) {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    root.appendChild(this.canvas);

    const gl = this.canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: false });
    if (!gl) throw new Error("BandLayer: WebGL2 unavailable");
    this.gl = gl;

    this.prog = program(gl, VS, FS);
    gl.useProgram(this.prog);

    // Only the uniforms the Observatory frag uses:
    const U = (n: string) => gl.getUniformLocation(this.prog, n)!;
    [
      "u_scroll",
      "u_bandFreq", "u_bandTilt", "u_bandSoft", "u_bandAlpha",
      "u_gradeTop", "u_gradeBot", "u_gamma", "u_vignette",
      "u_resolution",
    ].forEach((n) => (this.u[n] = U(n)));
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.pxW = Math.max(1, Math.floor(cssW * dpr));
    this.pxH = Math.max(1, Math.floor(cssH * dpr));
    this.canvas.width = this.pxW;
    this.canvas.height = this.pxH;
  }

setBreath(b: BreathSample) {
  if (b.phase !== this.breath.phase) {
    this.prevPhase = this.breath.phase;
    this.breath = b;
    this.speed = 0;
    this.phaseTime = 0;        // <<< add this
  } else {
    this.breath = b;
  }
}


  update(dt: number) {
    const phase = this.breath.phase;

  // advance internal clock only while in a flowing phase
  if (phase === "inhale" || phase === "exhale") {
    this.phaseTime += dt;      // <<< add this
  }

    // Envelope with non-zero edge slope: immediate motion at phase start

    const bpm = Math.max(1e-3, this.breath.bpm || 6);
    const phaseDur = 30 / bpm;
    this.phaseDurHint = phaseDur;

    const p_int =
      phase === "inhale" || phase === "exhale"
        ? Math.min(1, this.phaseTime / phaseDur)
        : 0.5;

    this.pInt = p_int; // <-- store for HUD

    const envelope = phase === "pause" ? 0 : Math.sin(Math.PI * p_int);
    const dir = phase === "inhale" ? -1 : (phase === "exhale" ? +1 : 0);
    const K = 0.65;
    const target = dir * K * envelope;

    const tau = 0.22;
    const a = 1 - Math.exp(-dt / tau);
    this.speed += (target - this.speed) * a;

    if (phase === "pause") {
      const tauPause = 0.10;
      const ap = 1 - Math.exp(-dt / tauPause);
      this.speed += (0 - this.speed) * ap;
    }

    this.scroll += this.speed * dt;
    const period = 1 / this.P.bandFreq;
    this.scroll = ((this.scroll % period) + period) % period

  }

  getDebug() {
    return {
      phase: this.breath.phase,
      bpm: this.breath.bpm,
      pInt: this.pInt,               // 0..1 internal progress
      speed: this.speed,             // screen-heights / sec
      scroll: this.scroll,           // wrapped position
      freq: this.P.bandFreq,
      tilt: this.P.bandTilt,
      period: 1 / this.P.bandFreq,
      phaseTime: this.phaseTime,
      phaseDur: this.phaseDurHint,
    };
  }


  draw() {
    const gl = this.gl;
    if (!gl) return;
    gl.viewport(0, 0, this.pxW, this.pxH);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.prog);

    // Resolution
    gl.uniform2f(this.u.u_resolution, this.pxW, this.pxH);

    // Bands + grade
    gl.uniform1f(this.u.u_scroll, this.scroll);
    gl.uniform1f(this.u.u_bandFreq, this.P.bandFreq);
    gl.uniform1f(this.u.u_bandTilt, this.P.bandTilt);
    gl.uniform1f(this.u.u_bandSoft, this.P.bandSoft);
    gl.uniform1f(this.u.u_bandAlpha, this.P.bandAlpha);
    gl.uniform1f(this.u.u_gradeTop, this.P.gradeTop);
    gl.uniform1f(this.u.u_gradeBot, this.P.gradeBot);
    gl.uniform1f(this.u.u_gamma, this.P.gamma);
    gl.uniform1f(this.u.u_vignette, this.P.vignette);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
