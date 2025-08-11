import { ChamberBase } from "./ChamberBase";
import { WitnessNode } from "../actors/WitnessNode";
import { crossed } from "../utils/phaseUtils";

export class LookingGlassChamber extends ChamberBase {
  phase = 0;
  private phaseSpeed = 0.05;
  private witness: WitnessNode;
  private sparkle = 0;
  private alphaInterp = 0;
  private activeSide: "left" | "right" = "left";
  private pendingFlip = false; // flag until the next beat

  constructor(canvas: HTMLCanvasElement, services?: any) {
    super(canvas, services);
    this.witness = new WitnessNode(() => this.canvas.getBoundingClientRect());

    const b = this.canvas.getBoundingClientRect();
    this.witness.x = b.width / 4; // start on left
    this.witness.y = b.height / 2;
  }

  setPhaseSpeed(v: number) {
    this.phaseSpeed = v;
  }
  setWitnessFacing(dx: number, dy: number) {
    this.witness.setFacing(dx, dy);
  }
  thrustWitness(amt = 1) {
    this.witness.thrust(amt);
  }

onBeat() {
  this.sparkle = 0.2;

  if (this.pendingFlip) {
    this.activeSide = this.activeSide === "left" ? "right" : "left";
    this.pendingFlip = false;
    // Optional: play a flip sound or visual burst here
  }
}


  update(dt: number) {
    const midX = this.vp.w / 2;
    if (this.activeSide === "left" && this.witness.x > midX) {
      this.pendingFlip = true;
    } else if (this.activeSide === "right" && this.witness.x < midX) {
      this.pendingFlip = true;
    }

    this.phase = (this.phase + this.phaseSpeed * dt) % 1;
    this.witness.update(dt);
    if (this.sparkle > 0) this.sparkle = Math.max(0, this.sparkle - dt);
  }

  render(alpha: number) {
    const { ctx } = this;
    const { w, h } = this.vp;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "rgba(20,20,30,1)";
    ctx.fillRect(0, 0, w, h);

    const midX = w / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();

    // real
    this.witness.render(ctx);

    // mirror
    ctx.save();
    ctx.translate(w, 0); // not canvas.width
    ctx.scale(-1, 1);
    this.witness.render(ctx);
    ctx.restore();

    // Sparkle overlay
    if (this.sparkle > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.sparkle * 5);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}
