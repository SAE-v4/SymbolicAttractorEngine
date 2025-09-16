// src/renderers/axisRails.ts
import { PAL } from "@/chambers/_legacy/solarSpiralGate/config/palette";

export function drawAxisRails(
  g: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  inhale01: number,
  pal: ReturnType<typeof PAL>
){
  const railW = 2;
  const lenV  = r * 3.3;
  const lenH  = r * 3.8;

  // vertical
  {
    const aUp = 0.18 + 0.42 * inhale01;         // upper glow on inhale
    const aDn = 0.18 + 0.42 * (1 - inhale01);   // lower glow on exhale
    g.save();
    g.lineCap = "round";
    // up
    g.globalAlpha = aUp;
    g.strokeStyle = pal.css("ring", 0.85);
    g.lineWidth = railW;
    g.beginPath(); g.moveTo(cx, cy - lenV); g.lineTo(cx, cy); g.stroke();
    // down
    g.globalAlpha = aDn;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + lenV); g.stroke();
    g.restore();
  }

  // horizontal (gentle, symmetric)
  {
    const a = 0.14 + 0.18 * (0.5 - Math.cos(inhale01 * Math.PI) * 0.5);
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = pal.css("ring", 0.6);
    g.lineWidth = railW;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(cx - lenH, cy); g.lineTo(cx + lenH, cy); g.stroke();
    g.restore();
  }
}
