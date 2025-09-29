import vertSrc from './shaders/vert.glsl?raw';
import fragSrc from './shaders/frag.glsl?raw';
import type { BandsUniforms, BandsLens } from "./BandTypes";

function createShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) || "shader error";
    gl.deleteShader(s);
    throw new Error(log);
  }
  return s;
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const v = createShader(gl, gl.VERTEX_SHADER, vs);
  const f = createShader(gl, gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, "a_pos");
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p) || "link error";
    gl.deleteProgram(p);
    throw new Error(log);
  }
  return p;
}

export class BandsProgram {
  private gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;

  // uniform locations
  u = {} as Record<string, WebGLUniformLocation>;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl, vertSrc, fragSrc);

    // fullscreen quad [-1,1] with two triangles
    const quad = new Float32Array([
      -1, -1,  +1, -1,  -1, +1,
      -1, +1,  +1, -1,  +1, +1
    ]);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.bindVertexArray(null);
    this.vao = vao;

    const U = (name: string) => gl.getUniformLocation(this.program, name)!;
    const names = [
      "u_resolution","u_time",
      "u_lens","u_phase","u_value","u_velocity","u_bpm",
      "u_bandFreq","u_bandTilt","u_bandSoft","u_driftBase","u_driftGain","u_bandAlpha",
      "u_gradeTop","u_gradeBot","u_gamma","u_vignette",
      "u_phaseBandY","u_phaseBandWidth","u_phaseBandSoft","u_phaseBandAlpha","u_phaseBandValue",
      "u_ifreqDelta","u_itiltDelta","u_iAlpha",
    ];
    names.forEach(n => this.u[n] = U(n));
  }

  setUniforms(params: BandsUniforms, timeSec: number, width: number, height: number) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform2f(this.u["u_resolution"], width, height);
    gl.uniform1f(this.u["u_time"], timeSec);

    const lensIndex = ((): number => {
      switch (params.lens) {
        case "observatory": return 0;
        case "witness":     return 1;
        case "metabolic":   return 2;
        case "garden":      return 3;
      }
    })();

    gl.uniform1i(this.u["u_lens"], lensIndex);
    gl.uniform1i(this.u["u_phase"], params.phase);
    gl.uniform1f(this.u["u_value"], params.value);
    gl.uniform1f(this.u["u_velocity"], params.velocity);
    gl.uniform1f(this.u["u_bpm"], params.bpm);

    gl.uniform1f(this.u["u_bandFreq"], params.bandFreq);
    gl.uniform1f(this.u["u_bandTilt"], params.bandTilt);
    gl.uniform1f(this.u["u_bandSoft"], params.bandSoft);
    gl.uniform1f(this.u["u_driftBase"], params.driftBase);
    gl.uniform1f(this.u["u_driftGain"], params.driftGain);
    gl.uniform1f(this.u["u_bandAlpha"], params.bandAlpha);

    gl.uniform1f(this.u["u_gradeTop"], params.gradeTop);
    gl.uniform1f(this.u["u_gradeBot"], params.gradeBot);
    gl.uniform1f(this.u["u_gamma"], params.gamma);
    gl.uniform1f(this.u["u_vignette"], params.vignette);

    gl.uniform1f(this.u["u_phaseBandY"], params.phaseBandY ?? 0.5);
    gl.uniform1f(this.u["u_phaseBandWidth"], params.phaseBandWidth ?? 0.0);
    gl.uniform1f(this.u["u_phaseBandSoft"], params.phaseBandSoft ?? 0.0);
    gl.uniform1f(this.u["u_phaseBandAlpha"], params.phaseBandAlpha ?? 0.0);
    gl.uniform1f(this.u["u_phaseBandValue"], params.phaseBandValue ?? 0.85);

    gl.uniform1f(this.u["u_ifreqDelta"], params.iFreqDelta ?? 0.0);
    gl.uniform1f(this.u["u_itiltDelta"], params.iTiltDelta ?? 0.0);
    gl.uniform1f(this.u["u_iAlpha"], params.iAlpha ?? 0.0);
  }

  draw() {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }
}
