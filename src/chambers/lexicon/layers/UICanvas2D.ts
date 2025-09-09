import type { SymbolicPhrase } from "@/symbolic-ui/vocab/types";

export class UICanvas2D {
  constructor(private canvas: HTMLCanvasElement) {}

  draw(phrases: SymbolicPhrase[], breath01: number, gaze: {vx:number;vy:number}) {
    const g = this.canvas.getContext("2d")!;
    const { width, height } = this.canvas;
    g.clearRect(0, 0, width, height);

    // Gaze indicator
    g.save();
    g.translate(width*0.75, height*0.5);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(gaze.vx * 40, gaze.vy * 40);
    g.strokeStyle = "rgba(220,235,255,0.8)";
    g.lineWidth = 2;
    g.stroke();
    g.restore();

    // Phrase labels
    const cx = width * 0.25, cy = height * 0.5, pad = 26;
    phrases.forEach((ph, i) => {
      const y = cy + (i - (phrases.length - 1) / 2) * pad;
      // bullet proxy for glyph
      g.beginPath();
      g.arc(cx - 70, y, 10 + 6 * breath01, 0, Math.PI * 2);
      g.fillStyle = `rgba(200,220,255,${0.6 + 0.35 * breath01})`;
      g.fill();
      // label
      g.fillStyle = "#dfe9ff";
      g.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
      g.fillText(ph.label, cx - 50, y + 5);
    });
  }
}
