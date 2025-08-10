// src/chambers/demo/DemoChamber.ts
import { ChamberBase } from "../ChamberBase";
import { WitnessNode } from "../../actors/WitnessNode";

export class DemoChamber extends ChamberBase {
  phase = 0;
  private phaseSpeed = 0.05;
  private witness: WitnessNode;
  private sparkle = 0;

// Return true when phase crosses a beat grid (e.g., quarter-beats)
  public crossed(thresholds: number[], prevPhase: number, currPhase: number): number | null {
    for (const t of thresholds) {
      const c = (prevPhase <= t && currPhase >= t) ||
                (prevPhase > currPhase && (currPhase >= t || prevPhase <= t)); // wrap
      if (c) return t;
    }
    return null;
  }


  constructor(canvas: HTMLCanvasElement, services?: any) {
    super(canvas, services);
    this.witness = new WitnessNode(() => this.canvas.getBoundingClientRect());
    const b = this.canvas.getBoundingClientRect();
    this.witness.x = b.width/2; this.witness.y = b.height/2;
  }

  setPhaseSpeed(v:number){ this.phaseSpeed = v; }
  setWitnessFacing(dx:number,dy:number){ this.witness.setFacing(dx,dy); }
  thrustWitness(amt=1){ this.witness.thrust(amt); }
  beatSparkle(){ this.sparkle = 0.2; }

  update(dt:number){
    this.phase = (this.phase + this.phaseSpeed*dt) % 1;
    this.witness.update(dt);
    if (this.sparkle > 0) this.sparkle = Math.max(0, this.sparkle - dt);
  }

render() {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;

    // background gradient: day-night by phase
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const day = Math.sin(this.phase * Math.PI * 2) * 0.5 + 0.5;
    g.addColorStop(0, `rgba(${Math.floor(40+140*day)}, ${Math.floor(90+100*day)}, 255, 1)`);
    g.addColorStop(1, `rgba(10, 10, ${Math.floor(50+100*day)}, 1)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // sun & moon
    const cx = w * 0.5, cy = h * 0.55, r = Math.min(w, h) * 0.35;
    const angle = this.phase * Math.PI * 2;
    const sunX = cx + r * Math.cos(angle);
    const sunY = cy - r * Math.sin(angle);

    const moonAngle = angle + Math.PI;
    const moonX = cx + r * Math.cos(moonAngle);
    const moonY = cy - r * Math.sin(moonAngle);

    // orbit
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();

    // sun
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.max(6, r*0.04), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 220, 80, 1)";
    ctx.shadowColor = "rgba(255, 200, 80, 0.8)";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // moon
    ctx.beginPath();
    ctx.arc(moonX, moonY, Math.max(5, r*0.035), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220, 230, 255, 0.95)";
    ctx.fill();

     if (this.sparkle > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.sparkle * 5);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    this.witness.render(ctx);

  }
}
