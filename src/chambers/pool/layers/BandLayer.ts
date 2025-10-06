// src/chambers/pool/layers/BandLayer.ts
// Ultra-safe single-program BandLayer for Observatory frag.glsl

import { LENSES } from "@/systems/bands/Presets";
import type { LensKey, ShaderProfile } from "@systems/bands/BandTypes";

// === Vertex & Fragment (observatory only) ===
const VERT_SRC = `#version 300 es
layout (location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;
import OBS_FRAG from "@/systems/bands/shaders/frag.glsl?raw";

// === Local types ===
type BreathPhase = "inhale" | "pause" | "exhale";
type DayPhase = "dawn" | "day" | "dusk" | "night";

// === Helper ===
function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }

/**
 * Ultra-safe BandLayer
 * - No program swaps
 * - Writes ONLY the uniforms declared in frag.glsl you pasted:
 *   u_scroll, u_bandFreq, u_bandTilt, u_bandSoft, u_bandAlpha,
 *   u_gradeTop, u_gradeBot, u_gamma, u_vignette
 * - Optional: simple pause accent via alpha (off by default)
 */
export class BandLayer {
  // GL
  private canvas!: HTMLCanvasElement;
  private gl!: WebGL2RenderingContext;
  private vao!: WebGLVertexArrayObject | null;
  private prog!: WebGLProgram;

  // Uniforms
  private u: Record<string, WebGLUniformLocation | null> = {};

  // Lens profiles (CPU-side only; we never switch programs)
  private current: ShaderProfile = LENSES.observatory;
  private target: ShaderProfile | null = null;
  private fadeRemaining = 0;

  // Runtime
  private _activeLens: LensKey = "observatory";
  private _breath = { phase: "inhale" as BreathPhase, value: 0, bpm: 6, velocity: 0, tGlobal: 0 };
  private _day: { tDay01: number; phase: DayPhase } = { tDay01: 0, phase: "day" };
  private pInt = 0;       // integrated scroll
  private _speed = 0;     // HUD
  private _period = 0;    // HUD
  private _scroll = 0;    // HUD

  // Toggles
  private enablePauseAccent = false;  // ← start OFF. Flip true after stable.
  private inhaleDriftsUp = true;      // if drift direction feels inverted, set false.

  // Velocity estimator
  private _prevVal = 0; private _prevT = 0;

  // ---- lifecycle ----
  mount(root: ShadowRoot | HTMLElement) {
    // Canvas + GL
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute; inset:0; width:100%; height:100%; display:block;";
    root.appendChild(this.canvas);

    const gl = this.canvas.getContext("webgl2", { antialias: true, depth: false, stencil: false, premultipliedAlpha: true });
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    // Program
    this.prog = this.createProgram(VERT_SRC, OBS_FRAG);
    this.setupVAO();
    this.cacheUniforms();

    // Defaults
    this._activeLens = "observatory";
    this.current = LENSES.observatory;
    this.initUniformDefaults();
  }

  resize(w: number, h: number, dpr = 1) {
    const W = Math.max(1, Math.floor(w * dpr));
    const H = Math.max(1, Math.floor(h * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W; this.canvas.height = H;
      this.gl.viewport(0, 0, W, H);
    }
  }

  setClock(day01: number, phase: DayPhase) {
    this._day.tDay01 = day01;
    this._day.phase = phase;
  }

  setBreath(b: { value: number; phase: BreathPhase; bpm: number; velocity?: number; tGlobal?: number; }) {
    // robust velocity estimate
    const t = b.tGlobal ?? performance.now() / 1000;
    const dt = Math.max(1e-3, t - (this._prevT || t - 1e-3));
    const v = (b.velocity ?? ((b.value - (this._prevVal ?? b.value)) / dt));
    this._prevVal = b.value; this._prevT = t;

    this._breath = { value: b.value, phase: b.phase, bpm: b.bpm, velocity: v, tGlobal: t };
  }

  // In safe mode: lens only lerps CPU profile; shader stays the same
  setLens(key: LensKey, fadeSec = 1.0) {
    if (key === this._activeLens) return;
    const next = LENSES[key]; if (!next) return;
    this._activeLens = key;
    this.target = next;
    this.fadeRemaining = Math.max(0.0001, fadeSec);
  }

  update(dt: number) {
    // drift integration: inhale up / exhale down (flip if needed)
    const sign = this.inhaleDriftsUp ? +1 : -1;
    const dir = this._breath.phase === "inhale" ? +1 : this._breath.phase === "exhale" ? -1 : 0;
    const base = (this.current.uniforms as any).u_driftBase ?? 0.10;
    const gain = (this.current.uniforms as any).u_driftGain ?? 0.20;
    const vel = Math.abs(this._breath.velocity ?? 0);
    const speed = base + gain * vel;
    this._speed = sign * dir * speed;
    this.pInt += this._speed * dt;

    // HUD helpers
    const freq = (this.current.uniforms as any).u_bandFreq ?? 5.0;
    this._period = freq > 0 ? (1.0 / freq) : 0;
    this._scroll = this.pInt;

    // profile fade
    if (this.target) {
      const step = Math.min(1, dt / this.fadeRemaining);
      this.lerpLens(step);
      this.fadeRemaining -= dt;
      if (this.fadeRemaining <= 0) {
        this.current = this.target;
        this.target = null;
      }
    }
  }

  draw() {
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);

    // Map current profile to shader uniforms (match EXACT names in frag.glsl)
    const U = this.current.uniforms as any;

    // Core
    this.set1f("u_bandFreq",  finite(U.u_bandFreq, 5.4));
    this.set1f("u_bandSoft",  finite(U.u_bandSoft ?? U.u_soften, 0.82));
    this.set1f("u_bandTilt",  finite(U.u_bandTilt ?? U.u_tilt, 0.015));

    // Alpha (single channel in frag): base +/- tiny pause accent if enabled
    let alpha = finite(U.u_bandAlpha ?? U.u_alphaBase, 0.14);
    if (this.enablePauseAccent) {
      const pause = this._breath.phase === "pause" ? 1 : 0;
      alpha = clamp01(alpha + 0.12 * pause); // subtle brightening on pause
    }
    this.set1f("u_bandAlpha", alpha);

    // Grade ramp: prefer explicit top/bot if provided; else derive from lift
    const hasTopBot = (typeof U.u_gradeTop === "number") && (typeof U.u_gradeBot === "number");
    if (hasTopBot) {
      this.set1f("u_gradeTop", clamp01(U.u_gradeTop));
      this.set1f("u_gradeBot", clamp01(U.u_gradeBot));
    } else {
      const lift = finite(U.u_gradeLift, 0.035);
      this.set1f("u_gradeTop", clamp01(0.75 + lift));
      this.set1f("u_gradeBot", clamp01(0.25 - lift));
    }

    // Gamma & vignette
    this.set1f("u_gamma",    Math.max(0.01, finite(U.u_gamma ?? U.u_yGamma, 1.28)));
    this.set1f("u_vignette", clamp01(finite(U.u_vignette, 0.18)));

    // Scroll
    this.set1f("u_scroll", -this.pInt);

    // Draw
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
  }

  getDebug() {
    return {
      phase: this._breath.phase,
      pInt: this.pInt,
      speed: this._speed,
      scroll: this._scroll,
      period: this._period,
      bpm: this._breath.bpm,
      freq: (this.current.uniforms as any).u_bandFreq ?? 0,
      tilt: (this.current.uniforms as any).u_bandTilt ?? (this.current.uniforms as any).u_tilt ?? 0,
      lens: this._activeLens,
      blendT: this.fadeRemaining
    };
  }

  // ---- internals ----
  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;
    const vs = this.compile(gl.VERTEX_SHADER, vertSrc);
    const fs = this.compile(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error("Program link error: " + info);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error("Shader compile error: " + info);
    }
    return s;
  }

  private setupVAO() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    this.vao = vao;
    gl.bindVertexArray(vao);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // full-screen triangle
    const tri = new Float32Array([ -1, -1,  3, -1,  -1,  3 ]);
    gl.bufferData(gl.ARRAY_BUFFER, tri, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  private cacheUniforms() {
    const gl = this.gl;
    gl.useProgram(this.prog);
    const names = [
      "u_scroll",
      "u_bandFreq", "u_bandTilt", "u_bandSoft", "u_bandAlpha",
      "u_gradeTop", "u_gradeBot", "u_gamma", "u_vignette",
    ];
    this.u = {};
    names.forEach(n => { this.u[n] = gl.getUniformLocation(this.prog, n); });
  }

  private initUniformDefaults() {
    this.gl.useProgram(this.prog);
    this.set1f("u_scroll", 0.0);
    this.set1f("u_bandFreq", 5.4);
    this.set1f("u_bandTilt", 0.015);
    this.set1f("u_bandSoft", 0.82);
    this.set1f("u_bandAlpha", 0.14);
    this.set1f("u_gradeTop", 0.75);
    this.set1f("u_gradeBot", 0.25);
    this.set1f("u_gamma", 1.28);
    this.set1f("u_vignette", 0.18);
  }

  private lerpLens(t: number) {
    const A = this.current.uniforms as any;
    const B = this.target!.uniforms as any;
    const L = (a: number, b: number) => a + (b - a) * t;
    Object.keys(A).forEach(k => {
      if (typeof A[k] === "number" && typeof B[k] === "number") {
        A[k] = L(A[k], B[k]);
      }
    });
  }

  private set1f(name: string, v: number) {
    const loc = this.u[name];
    if (loc && Number.isFinite(v)) this.gl.uniform1f(loc, v);
  }
}

// finite helper
function finite(v: any, fallback: number) {
  return Number.isFinite(v) ? v : fallback;
}
