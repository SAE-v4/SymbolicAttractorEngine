// src/chambers/pool/layers/EchoLayer.ts
import type { BreathSample } from "@/types/";
import type { Lens } from "@/types/";
import type { PoolKind } from "@/types/"; // use relative path

type Echo = {
  kind: PoolKind;
  x: number; y: number;
  t: number; life: number;
  dir?: "cw"|"ccw";
};

export class EchoLayer {
  private w = 1; private h = 1;
  private echoes: Echo[] = [];

  resize(w:number, h:number){ this.w = w; this.h = h; }

  /**
   * Spawn a gesture echo. Life is scaled by confidence; cap echo count.
   */
  spawn(
    e: { kind: PoolKind; centroid:{x:number;y:number}; dir?:"cw"|"ccw"; confidence:number },
    _breath: BreathSample,
    _lens: Lens
  ){
    const base =
      e.kind === "tap-hold"      ? 900  :
      e.kind === "trace-zigzag"  ? 1200 : 1600;   // spiral default

    const life = Math.max(700, base * (0.6 + 0.4 * e.confidence));

    this.echoes.push({
      kind: e.kind, x: e.centroid.x, y: e.centroid.y,
      dir: e.dir, t: 0, life
    });

    if (this.echoes.length > 12) this.echoes.shift();
  }

  /**
   * Draw + advance. Uses elapsed approximation; chamber render controls cadence.
   */
  draw(g: CanvasRenderingContext2D, breath: BreathSample){
    // phase tint (optional, subtle)
    const tint =
      breath.phase === "pause"   ? 0.9 :
      breath.phase === "inhale"  ? 0.75 : 0.6;

    this.echoes = this.echoes.filter(E => {
      const a = 1 - (E.t / E.life);          // 1 → 0
      if (a <= 0) return false;

      g.save();
      // fade with a soft ease and phase tint
      g.globalAlpha = Math.max(0, Math.pow(a, 2.0) * tint);

      // radius expands with time; different “feels” per kind (can tweak later)
      const R =
        E.kind === "tap-hold"     ? (1 - a) * 60 + 6 :
        E.kind === "trace-zigzag" ? (1 - a) * 80 + 7 :
                                    (1 - a) * 96 + 8;

      g.beginPath();
      g.arc(E.x, E.y, R, 0, Math.PI * 2);

      // simple style for now; swap to palette-aware later
      g.strokeStyle = "rgba(255,255,255,0.8)";
      g.lineWidth = E.kind === "tap-hold" ? 1.25 : 1.5;
      g.stroke();
      g.restore();

      // advance time (approx; the chamber calls draw every frame anyway)
      E.t += 16.7;
      return true;
    });
  }
}
