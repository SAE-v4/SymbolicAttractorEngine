// add this import at top
import type { DayPhase } from "@/types";

// extend the DebugSample shape
export type DebugSample = {
  fps: number;
  // micro (breath)
  phase: "inhale"|"pause"|"exhale";
  value: number;          // -1..+1
  glimmer: number;        // 0..1
  // meso (day)
  day01?: number;         // 0..1 over a virtual day
  dayPhase?: DayPhase;    // optional label if you want it
  // lens + bands
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

    // panel bg
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(pad-4, pad-4, 260, 150);

    // text
    g.fillStyle = "white";
    const lines = [
      `fps: ${s.fps.toFixed(1)}`,
      `lens: ${s.lens}`,
      (s.dayPhase ? `day: ${s.dayPhase}  ` : "") + (s.day01 != null ? `day01: ${s.day01.toFixed(3)}` : ""),
      `phase: ${s.phase}`,
      `breath v: ${s.value.toFixed(3)}`,
      `glimmer: ${s.glimmer.toFixed(2)}`,
      `spacing: ${s.spacing.toFixed(2)}  thick: ${s.thick.toFixed(2)}`,
      `lead: ${s.lead.toFixed(2)}  lag: ${s.lag.toFixed(2)}`,
      `α(shadow): ${s.alphaShadow.toFixed(2)}  α(light): ${s.alphaLight.toFixed(2)}`,
    ].filter(Boolean);

    let y = pad + 12;
    for (const L of lines) { g.fillText(L, pad, y); y += 14; }

    // breath osc (vertical marker for value -1..+1)
    const ox = pad, oy = y + 8;
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillText("breath osc", ox, oy);
    const bx = ox, by = oy + 6, w = 220, h = 22;
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.strokeRect(bx, by, w, h);
    const t = (s.value + 1) * 0.5; // 0..1
    g.fillStyle = "rgba(255,255,255,0.45)";
    g.fillRect(bx, by + (1 - t) * h - 2, w, 4);

    // day progress bar (0..1)
    const dLabelY = by + h + 18;
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillText("day progress", ox, dLabelY);
    const dy = dLabelY + 6, dw = 220, dh = 8;
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.strokeRect(bx, dy, dw, dh);
    if (s.day01 != null) {
      g.fillStyle = "rgba(255,255,255,0.7)";
      g.fillRect(bx, dy, dw * Math.max(0, Math.min(1, s.day01)), dh);
    }

    g.restore();
  }
}
