import { ChamberBase } from "../ChamberBase";
import { WitnessNode } from "../../actors/WitnessNode";
import { crossed as crossedPhase } from "../../utils/phaseUtils";

export class DemoChamber extends ChamberBase {
  phase = 0;
  private phaseSpeed = 0.05;

  private witness: WitnessNode;
  private sparkle = 0;
  private eyeGlow = 0; // 0..1, decays over time

  constructor(canvas: HTMLCanvasElement, services?: any) {
    super(canvas, services);
    this.witness = new WitnessNode(() => this.canvas.getBoundingClientRect());
    const b = this.canvas.getBoundingClientRect();
    this.witness.x = b.width / 2; this.witness.y = b.height / 2;
  }

  setPhaseSpeed(v:number){ this.phaseSpeed = v; }
  setWitnessFacing(dx:number,dy:number){ this.witness.setFacing(dx,dy); }
  thrustWitness(amt=1){ this.witness.thrust(amt); }
  beatSparkle(){ this.sparkle = 0.2; }

  update(dt:number){
    this.phase = (this.phase + this.phaseSpeed*dt) % 1;
    this.witness.update(dt);
    if (this.sparkle > 0) this.sparkle = Math.max(0, this.sparkle - dt);
    if (this.eyeGlow > 0)  this.eyeGlow  = Math.max(0, this.eyeGlow  - dt * 2.5);
  }

  // --- Beat hook: call this from main when a threshold is crossed
  onBeat() {
    this.beatSparkle();

    // If Witness is "looking at" the Sun within ~18°, add eye glow
    const sun = this.getSunPos();
    const toSun = this.norm({
      x: sun.x - this.witness.x,
      y: sun.y - this.witness.y,
    });
    const facing = this.witness.facing;
    const dot = facing.x * toSun.x + facing.y * toSun.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))); // radians
    const threshold = (18 * Math.PI) / 180; // ~18°

    if (angle <= threshold) {
      this.eyeGlow = 1; // will decay in update()
    }
  }

  render(alpha: number) {
    const { ctx, canvas } = this;

    // background gradient (as before)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const day = Math.sin(this.phase * Math.PI * 2) * 0.5 + 0.5;
    g.addColorStop(0, `rgba(${Math.floor(40+140*day)}, ${Math.floor(90+100*day)}, 255, 1)`);
    g.addColorStop(1, `rgba(10, 10, ${Math.floor(50+100*day)}, 1)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // orbit + bodies
    const geo = this.getOrbitGeometry();
    // orbit
    ctx.beginPath();
    ctx.arc(geo.cx, geo.cy, geo.r, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();

    // sun
    const sun = this.getSunPos();
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, Math.max(6, geo.r*0.04), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 220, 80, 1)";
    ctx.shadowColor = "rgba(255, 200, 80, 0.8)";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // moon (opposite)
    const moon = this.getMoonPos();
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, Math.max(5, geo.r*0.035), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220, 230, 255, 0.95)";
    ctx.fill();

    // beat overlay
    if (this.sparkle > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.sparkle * 5);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // witness
    this.witness.render(ctx, { eyeGlow: this.eyeGlow });
  }

  // --- helpers ---
  private getOrbitGeometry() {
    const w = this.canvas.width, h = this.canvas.height;
    const cx = w * 0.5, cy = h * 0.55, r = Math.min(w, h) * 0.35;
    return { cx, cy, r };
    // keep these numbers aligned with render aesthetics
  }

  private getSunPos() {
    const { cx, cy, r } = this.getOrbitGeometry();
    const angle = this.phase * Math.PI * 2;
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  }

  private getMoonPos() {
    const { cx, cy, r } = this.getOrbitGeometry();
    const angle = this.phase * Math.PI * 2 + Math.PI;
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  }

  private norm(v:{x:number;y:number}) {
    const m = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / m, y: v.y / m };
  }
}
