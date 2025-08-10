import { ChamberBase } from "./ChamberBase";
import { WitnessNode } from "../actors/WitnessNode";
import { crossed } from "../utils/phaseUtils";

export class LookingGlassChamber extends ChamberBase {
  phase = 0;
  private phaseSpeed = 0.05;
  private witness: WitnessNode;
  private sparkle = 0;
  private alphaInterp = 0; // optional smooth render use

  constructor(canvas: HTMLCanvasElement, services?: any) {
    super(canvas, services);
    this.witness = new WitnessNode(() => this.canvas.getBoundingClientRect());
    const b = this.canvas.getBoundingClientRect();
    this.witness.x = b.width / 4; // start on left side
    this.witness.y = b.height / 2;
  }

  setPhaseSpeed(v: number) { this.phaseSpeed = v; }
  setWitnessFacing(dx: number, dy: number) { this.witness.setFacing(dx, dy); }
  thrustWitness(amt = 1) { this.witness.thrust(amt); }

  onBeat() {
    this.sparkle = 0.2;
    // Later: flip rules or states here on certain thresholds
  }

  update(dt: number) {
    this.phase = (this.phase + this.phaseSpeed * dt) % 1;
    this.witness.update(dt);
    if (this.sparkle > 0) this.sparkle = Math.max(0, this.sparkle - dt);
  }

  render(alpha: number) {
    this.alphaInterp = alpha;
    const { ctx, canvas } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw central vertical mirror line
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Draw witness on real side
    this.witness.render(ctx);

    // Mirror transform for the reflected side
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    this.witness.render(ctx);
    ctx.restore();

    // Optional sparkle overlay
    if (this.sparkle > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.sparkle * 5);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }
}
