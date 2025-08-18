// src/renderers/skygl/SkyGLRenderer.ts
export class SkyGLRenderer {
  private gl: WebGLRenderingContext; private prog: WebGLProgram;
  private uTime:number; private uRes:number; private uBreath:number;
  private breath01 = 0;
  constructor(canvas: HTMLCanvasElement) { /* compile, link, lookup uniforms */ }
  setBloom(b:number){ this.breath01 = Math.max(0, Math.min(1, b)); }
  render(ctx:{breath01:number; t:number}) {
    const gl = this.gl;
    gl.viewport(0,0,gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.prog);
    gl.uniform1f(this.uTime, ctx.t);
    gl.uniform2f(this.uRes, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.uBreath, this.breath01);
    // draw full-screen tri
  }
}
