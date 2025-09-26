// // Minimal WebGL bands background for <sae-field-bg>
// // Step 1: neutral breathing bands + palette hook + breath input.
// // Step 2/3 will add tilt + spiral focus + gesture hooks.

// import type { BreathPhase } from "@/types/Core";

// // Keep it tiny; you can move helpers to a shared GL util later.
// function createShader(gl: WebGL2RenderingContext, type: number, src: string) {
//   const sh = gl.createShader(type)!;
//   gl.shaderSource(sh, src);
//   gl.compileShader(sh);
//   if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
//     throw new Error(gl.getShaderInfoLog(sh) || "shader compile failed");
//   }
//   return sh;
// }

// function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
//   const prog = gl.createProgram()!;
//   gl.attachShader(prog, createShader(gl, gl.VERTEX_SHADER, vs));
//   gl.attachShader(prog, createShader(gl, gl.FRAGMENT_SHADER, fs));
//   gl.linkProgram(prog);
//   if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
//     throw new Error(gl.getProgramInfoLog(prog) || "program link failed");
//   }
//   return prog;
// }

// type LocalBreath = { phase: BreathPhase; value: number; bpm: number; tGlobal: number; };

// const VERT = `#version 300 es
// in vec2 a_pos;
// void main(){ gl_Position = vec4(a_pos,0.0,1.0); }
// `;

// // Bands-only; no tilt/focus yet (we’ll add those later).
// const FRAG = `#version 300 es
// precision highp float;
// out vec4 o;

// uniform vec2  u_res;
// uniform float u_travel;
// uniform float u_bands;
// uniform float u_soft;
// uniform float u_contrast;
// uniform vec3  u_top;
// uniform vec3  u_bottom;
// uniform float u_dir;        // -1 = exhale, 0 = pause, +1 = inhale
// uniform vec2  u_focus;      // focus pos (0..1 in UV coords)
// uniform float u_focusGain;  // 0..1

// float ringFn(float r, float k, float t){
//   return 0.5 + 0.5 * cos(6.2831853 * (r*k - t));
// }

// void main(){
//   vec2 uv = gl_FragCoord.xy / u_res;
//   vec2 p = uv - 0.5;

//   float r = length(p);
//   float k = u_bands;
//   float s = ringFn(r, k, u_travel);

//   float inhale = clamp(u_dir, 0.0, 1.0);
//   float exhale = clamp(-u_dir, 0.0, 1.0);

//   float exhaleEase = smoothstep(0.0, 0.7, exhale);
//   float contrastNow = mix(u_contrast, u_contrast * 0.75, exhaleEase);
//   s = pow(s, mix(1.0, 2.0, contrastNow));

//   float brightBias = 0.04;
//   s = clamp(s + brightBias * (inhale - exhale), 0.0, 1.0);

//   float darkenAmt = 0.15 * smoothstep(0.0, 0.7, exhale);
//   s = mix(s, 1.0 - s, darkenAmt);

//   float sSoft = mix(s, smoothstep(0.2, 0.8, s), u_soft);

//   // --- Focus falloff ---
//   vec2  df  = uv - u_focus;
//   float d2  = dot(df, df);

//   float kf   = 1.0 / (2.0 * pow(0.18, 2.0));   // avoid clash with band k
//   float w    = clamp(u_focusGain, 0.0, 1.0) * exp(-kf * d2);
//   w = clamp(w, 0.0, 1.0);

//   vec3 baseRaw = mix(u_bottom, u_top, sSoft);
//   vec3 color = baseRaw;

//   if (u_focusGain > 0.001) {
//     color = mix(color, u_top, 0.28 * w);
//   }

//   o = vec4(color, 1.0);
// }`;

// export class SaeFieldBgEl extends HTMLElement {
//   private canvas!: HTMLCanvasElement;
//   private gl!: WebGL2RenderingContext;
//   private prog!: WebGLProgram;
//   private vao!: WebGLVertexArrayObject;
//   private u: Record<string, WebGLUniformLocation> = {};
//   private raf = 0;
//   //  private startedAt = performance.now();
//   private bandTravel = 0;
//   private dirSmooth = 0;             // [-1..+1], eased authority
//   private lastNow = performance.now();
//   private tauMs = 160;

//   private focusPos: [number, number] = [0.5, 0.5];
//   private focusGain = 0.0;

//   // Tunables (attrs later if you like)
//   private params = {
//     bands: 11.0,
//     softness: 0.55,
//     contrast: 0.35,
//     // palette: neutral top/bottom (sRGB 0..1)
//     top: [0.93, 0.89, 0.78],  // warm-dawn-ish
//     bottom: [0.12, 0.18, 0.20]   // deep teal/blue
//   };

//   private breath: LocalBreath = { phase: "pause", value: 0.5, bpm: 6, tGlobal: 0 };

//   constructor() { super(); this.attachShadow({ mode: "open" }); }

//   connectedCallback() {
//     this.shadowRoot!.innerHTML = `
//       <style>:host{display:block;position:absolute;inset:0;contain:strict; pointer-events: none; }
// canvas { pointer-events: none; }</style>
//       <canvas part="canvas"></canvas>
//     `;
//     this.canvas = this.shadowRoot!.querySelector("canvas")!;
//     this.initGL();
//     this.resize();
//     window.addEventListener("resize", this.resize, { passive: true });

//     // Listen for bubbled breath events (from <engine-root> / chamber)
//     this.addEventListener("field-breath", (e: Event) => {
//       const d = (e as CustomEvent).detail as LocalBreath;
//       if (d) this.breath = d;
//     });

//     document.addEventListener("pool:spiral-accent", this.onPoolAccent as EventListener, { capture: true });

//     this.loop = this.loop.bind(this);
//     this.raf = requestAnimationFrame(this.loop);
//   }

//   disconnectedCallback() {
//       document.removeEventListener("pool:spiral-accent", this.onPoolAccent as EventListener, { capture:true } as any);

//     cancelAnimationFrame(this.raf);
//     window.removeEventListener("resize", this.resize);
//   }

//   // If you want imperative hooks later:
//   applyBreath(b: LocalBreath) { this.breath = b; }

//   private initGL() {
//     const gl = this.canvas.getContext("webgl2", { antialias: true, depth: false, stencil: false }) as WebGL2RenderingContext;
//     if (!gl) throw new Error("WebGL2 not available");
//     this.gl = gl;

//     // 1) Program
//     this.prog = createProgram(gl, VERT, FRAG);
//     gl.useProgram(this.prog);

//     // 2) Geometry (fullscreen quad)
//     const pos = new Float32Array([
//       -1, -1, +1, -1,
//       -1, +1, +1, +1
//     ]);
//     const buf = gl.createBuffer()!;
//     gl.bindBuffer(gl.ARRAY_BUFFER, buf);
//     gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

//     const aPos = gl.getAttribLocation(this.prog, "a_pos");
//     this.vao = gl.createVertexArray()!;
//     gl.bindVertexArray(this.vao);
//     gl.enableVertexAttribArray(aPos);
//     gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

//     // 3) Uniform locations (LOOKUP FIRST, don’t set values yet)
//     const u = (name: string) => {
//       const loc = gl.getUniformLocation(this.prog, name);
//       if (!loc) throw new Error(`Uniform not found: ${name}`);
//       return loc;
//     };
//     this.u = {
//       u_res: u("u_res"),
//       u_travel: u("u_travel"),
//       u_dir: u("u_dir"),
//       // u_phase:  (remove)
//       // u_value:  (remove)
//       // u_bpm:    (remove)
//       u_bands: u("u_bands"),
//       u_soft: u("u_soft"),
//       u_contrast: u("u_contrast"),
//       u_top: u("u_top"),
//       u_bottom: u("u_bottom"),
//       u_focus: u("u_focus"),
//       u_focusGain: u("u_focusGain"),
//     };


//     // 4) Do NOT set uniforms here; all uniforms are set every frame in loop()
//   }


//   private resize = () => {
//     const dpr = Math.max(1, window.devicePixelRatio || 1);
//     const rect = this.getBoundingClientRect();
//     const w = Math.max(1, Math.floor(rect.width * dpr));
//     const h = Math.max(1, Math.floor(rect.height * dpr));
//     if (this.canvas.width !== w || this.canvas.height !== h) {
//       this.canvas.width = w; this.canvas.height = h;
//       this.canvas.style.width = `${rect.width}px`;
//       this.canvas.style.height = `${rect.height}px`;
//       this.gl.viewport(0, 0, w, h);
//     }
//   };

// private onPoolAccent = (e: Event) => {
//   const d = (e as CustomEvent).detail;
//   console.log("accent@bg", d);
//   this.focusPos = d.pos;
//   this.focusGain = Math.min(1, Math.max(this.focusGain, 0.35 + 0.90*d.strength));
// };
//   private loop() {
//     const gl = this.gl;
//     const now = performance.now();
//     const dt = Math.max(0, (now - this.lastNow) / 1000); // seconds
//     this.lastNow = now;

//     // direction smoothing
//     const dirTarget = this.breath.phase === "inhale" ? 1 :
//       this.breath.phase === "exhale" ? -1 : 0;
//     const a = 1 - Math.exp(-(dt * 1000) / this.tauMs);
//     this.dirSmooth = this.dirSmooth + (dirTarget - this.dirSmooth) * a;

//     // travel integration
//     const speedBase = 0.08 + 0.02 * (this.breath.bpm ?? 6);
//     this.bandTravel += dt * speedBase * this.dirSmooth;

//     // focus decay
//     const decay = Math.exp(-(dt * 1000) / 600);
//     this.focusGain = Math.max(0, this.focusGain * decay);
//     if (this.focusGain < 0.001) this.focusGain = 0.0;

//     gl.useProgram(this.prog);
//     gl.bindVertexArray(this.vao);

//     // set all uniforms
//     gl.uniform2f(this.u.u_res, this.canvas.width, this.canvas.height);
//     gl.uniform1f(this.u.u_travel, this.bandTravel);
//     gl.uniform1f(this.u.u_dir, this.dirSmooth);

//     const phaseIdx = this.breath.phase === "inhale" ? 0 :
//       this.breath.phase === "pause" ? 1 : 2;

//     gl.uniform1f(this.u.u_bands, this.params.bands);
//     gl.uniform1f(this.u.u_soft, this.params.softness);
//     gl.uniform1f(this.u.u_contrast, this.params.contrast);

//     gl.uniform3f(this.u.u_top, this.params.top[0], this.params.top[1], this.params.top[2]);
//     gl.uniform3f(this.u.u_bottom, this.params.bottom[0], this.params.bottom[1], this.params.bottom[2]);

//     gl.uniform2f(this.u.u_focus, this.focusPos[0], this.focusPos[1]);
//     gl.uniform1f(this.u.u_focusGain, this.focusGain);

//     gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//     this.raf = requestAnimationFrame(this.loop);
//   }


// }

// customElements.define("sae-field-bg", SaeFieldBgEl);
