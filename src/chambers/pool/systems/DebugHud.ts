export type DebugSample = {
  fps: number;
  phase: "inhale"|"pause"|"exhale";
  value: number;          // -1..+1
  glimmer: number;        // 0..1
  lens: string;
  spacing: number;
  thick: number;
  lead: number;
  lag: number;
  alphaShadow: number;
  alphaLight: number;
};

export class DebugHud {
  private lastT = performance.now();
  private fps = 60;

  updateFps() {
    const now = performance.now();
    const dt = now - this.lastT;
    this.lastT = now;
    const inst = 1000 / Math.max(1, dt);
    this.fps = this.fps * 0.9 + inst * 0.1;
    return this.fps;
  }

  draw(g: CanvasRenderingContext2D, s: DebugSample) {
    const pad = 10;
    g.save();
    g.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(pad-4, pad-4, 240, 126);
    g.fillStyle = "white";

    const lines = [
      `fps: ${s.fps.toFixed(1)}`,
      `lens: ${s.lens}`,
      `phase: ${s.phase}`,
      `breath v: ${s.value.toFixed(3)}`,
      `glimmer: ${s.glimmer.toFixed(2)}`,
      `spacing: ${s.spacing.toFixed(2)}  thick: ${s.thick.toFixed(2)}`,
      `lead: ${s.lead.toFixed(2)}  lag: ${s.lag.toFixed(2)}`,
      `α(shadow): ${s.alphaShadow.toFixed(2)}  α(light): ${s.alphaLight.toFixed(2)}`,
    ];
    let y = pad + 12;
    for (const L of lines) { g.fillText(L, pad, y); y += 14; }

    // tiny osc for breath.value -1..+1
    const ox = pad; const oy = y + 8;
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillText("breath osc", ox, oy);
    const bx = ox; const by = oy + 6;
    const w = 220; const h = 22;
    g.strokeStyle = "rgba(255,255,255,0.25)"; g.strokeRect(bx, by, w, h);
    const t = (s.value + 1) * 0.5; // 0..1
    g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(bx, by + (1-t)*h - 2, w, 4);

    g.restore();
  }
}
