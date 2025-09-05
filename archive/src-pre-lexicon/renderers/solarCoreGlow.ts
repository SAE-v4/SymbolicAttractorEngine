import { PAL } from "@/config/palette";
import type { ChamberDef } from "@/types/ChamberDefs";

export function drawSolarCoreGlow(
  g: CanvasRenderingContext2D,
  def: ChamberDef,
  cx: number, cy: number, r: number,
  inhale: number = 0,        // 0..1 (from BreathRuntime)
  beatBoost: number = 0      // 0..1 quick flash on beat
){
  const pal = PAL(def);
  const amp = Math.min(1.6, 0.6 + 0.8*inhale + 0.6*beatBoost); // warmth scaler
  const core = r*0.20 + 2*amp;

  g.save();
  g.globalCompositeOperation = "lighter";

  // warm inner bloom
  const rg = g.createRadialGradient(cx,cy,0, cx,cy, core*3.2);
  rg.addColorStop(0.00, pal.css("solarCore", Math.min(1, 0.85*amp)));
  rg.addColorStop(0.45, pal.css("solarCore", 0.35*amp));
  rg.addColorStop(1.00, pal.css("solarCore", 0));
  g.fillStyle = rg;
  g.beginPath(); g.arc(cx, cy, core*3.2, 0, Math.PI*2); g.fill();

  // soft rim glare near the top (helps the "sun-cap" feeling)
  g.strokeStyle = pal.css("solarCore", 0.35 + 0.35*amp);
  g.lineCap = "round";
  g.lineWidth = 2.5 + 3.5*amp;
  const a0 = -Math.PI*0.28, a1 =  Math.PI*0.28;
  g.beginPath();
  g.arc(cx, cy, r*0.73, a0, a1, false);
  g.stroke();

  g.restore();
}
