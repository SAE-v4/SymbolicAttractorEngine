// src/chambers/pool/layers/TextLayer.ts
import type { BreathSample } from "@/types/Core";

export class TextLayer {
  private w = 1; private h = 1;

  resize(w:number, h:number){ this.w = w; this.h = h; }

  /** Breath-aware whisper stub; safe to ignore if you’re not showing text yet */
  draw(g: CanvasRenderingContext2D, breath: BreathSample) {
    // no-op until whispers are enabled; keeping signature aligned to avoid type errors
    // Example (commented): phase-aware watermark for quick debugging
    // g.save();
    // g.globalAlpha = 0.12 + 0.08 * (breath.phase === "pause" ? 1 : 0);
    // g.font = "12px system-ui, sans-serif";
    // g.fillStyle = "rgba(255,255,255,0.85)";
    // g.fillText(`breath: ${breath.phase}`, 10, this.h - 10);
    // g.restore();
  }
}
