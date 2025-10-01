// Minimal grayscale breathing bands — WebGL2 (multi-shader, modular)

import VS from "@systems/bands/shaders/vert.glsl?raw";
import { createProgram, getUniforms } from "@systems/bands/GL";
import { Dynamics, type BreathSample } from "@systems/bands/Dynamics";
import { PRESETS, ObservatoryProfile, lerpPreset } from "@systems/bands/Presets";
import type { LensKey } from "@systems/bands/BandTypes";
import { ShaderRegistry } from "@systems/bands/ShaderRegistry";

export class BandLayer {
  private canvas!: HTMLCanvasElement;
  private gl!: WebGL2RenderingContext;
  private prog!: WebGLProgram;
  private u!: Record<string, WebGLUniformLocation | null>;
  private vao!: WebGLVertexArrayObject;
  private pxW = 1;
  private pxH = 1;

  // Lens & presets
  private currentLens: LensKey = "observatory";
  private fromPreset = PRESETS.observatory;
  private toPreset   = PRESETS.observatory;
  private blendT = 1;           // 0..1
  private blendDur = 0.6;       // seconds
  private P = PRESETS.observatory;

  // Shader profile for the active lens
  private profile = ObservatoryProfile;

  private dyn = new Dynamics({ K: 0.65, tau: 0.22, tauPause: 0.10, bandFreq: PRESETS.observatory.bandFreq });
  private breath: BreathSample = { value: 0.5, phase: "pause", bpm: 6 };

  getDebug() {
    const s = this.dyn.get();
    return {
      phase: this.breath.phase,
      bpm: this.breath.bpm,
      pInt: s.pInt,
      speed: s.speed,
      scroll: s.scroll,
      freq: this.P.bandFreq,
      tilt: this.P.bandTilt,
      period: 1 / this.P.bandFreq,
      phaseTime: s.phaseTime,
      phaseDur: s.phaseDur,
      lens: this.currentLens,
      blendT: this.blendT,
      profile: this.profile.name,
    };
  }

  mount(root: ShadowRoot) {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
    root.appendChild(this.canvas);

    const gl = this.canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: false });
    if (!gl) throw new Error("BandLayer: WebGL2 unavailable");
    this.gl = gl;

    // WebGL2 requires a VAO even for gl_VertexID
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // Build initial program from the current lens entry
    this.loadProfile(this.currentLens);
  }

  private loadProfile(lens: LensKey) {
    const gl = this.gl;
    const entry = ShaderRegistry[lens];

    // (Re)create program with same VS but lens-specific FS
    const newProg = createProgram(gl, VS, entry.fs);

    // Replace program + uniform cache
    if (this.prog) gl.deleteProgram(this.prog);
    this.prog = newProg;
    gl.useProgram(this.prog);
    this.profile = entry.profile;

    // Requery uniforms for this profile’s shader
    this.u = getUniforms(gl, this.prog, [...this.profile.uniforms]);
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.pxW = Math.max(1, Math.floor(cssW * dpr));
    this.pxH = Math.max(1, Math.floor(cssH * dpr));
    this.canvas.width = this.pxW;
    this.canvas.height = this.pxH;
  }

  setBreath(b: BreathSample) {
    this.breath = b;
    this.dyn.setBreath(b);
  }

  // Public lens switch with smooth preset blend and (if needed) shader swap
  setLens(lens: LensKey, fadeSec = 0.6) {
    if (lens === this.currentLens && this.blendT >= 1) return;

    // Start preset blend from current effective P to target
    this.fromPreset = this.P;
    this.toPreset   = PRESETS[lens];
    this.blendT = 0;
    this.blendDur = Math.max(0.001, fadeSec);

    // If the shader profile differs, swap program immediately
    const nextEntry = ShaderRegistry[lens];
    const nextProfileName = nextEntry.profile.name;
    if (nextProfileName !== this.profile.name) {
      this.loadProfile(lens);
    }

    this.currentLens = lens;
  }

  update(dt: number) {
    // Blend presets over time
    if (this.blendT < 1) {
      this.blendT = Math.min(1, this.blendT + dt / this.blendDur);
      this.P = lerpPreset(this.fromPreset, this.toPreset, this.blendT);
    }
    // Keep Dynamics wrapping in sync with current bandFreq
    this.dyn.setBandFreq(this.P.bandFreq);

    // Advance motion
    this.dyn.update(dt, this.breath);
  }

  draw() {
    const gl = this.gl; if (!gl) return;
    gl.viewport(0, 0, this.pxW, this.pxH);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);

    const s = this.dyn.get();

    // Bind the (possibly blended) preset to the active shader
    this.profile.bind(gl, this.u, this.P, {
      scroll: s.scroll,
      // size: { w: this.pxW, h: this.pxH }, // only if your frag uses u_resolution
    });

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
