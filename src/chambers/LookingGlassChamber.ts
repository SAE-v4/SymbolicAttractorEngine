import { ChamberBase } from "./ChamberBase";
import { WitnessNode } from "../actors/WitnessNode";

export class LookingGlassChamber extends ChamberBase {
  phase = 0;
  private phaseSpeed = 0.05;

  private witness: WitnessNode;
  private sparkle = 0;

  // NEW: mirror state
  private activeSide: "left" | "right" = "left";
  private pendingFlip = false; // armed when you cross midline, executes on next beat
  private flipFlash = 0; // post-flip flash timer
  private t = 0; // render time for subtle pulses

  constructor(canvas: HTMLCanvasElement, services?: any) {
    super(canvas, services);
    this.witness = new WitnessNode(() => this.canvas.getBoundingClientRect());
    const b = this.canvas.getBoundingClientRect();
    this.witness.x = b.width / 4; // start on left
    this.witness.y = b.height / 2;
  }

  // small API used by controls
  getWitnessPos() {
    return { x: this.witness.x, y: this.witness.y };
  }
  setPhaseSpeed(v: number) {
    this.phaseSpeed = v;
  }

  setWitnessFacing(dx: number, dy: number) {
    // On the right side, mirror horizontal intent (feels "through the glass")
    if (this.activeSide === "right") dx = -dx;
    this.witness.setFacing(dx, dy);
  }

  thrustWitness(amt = 1) {
    this.witness.thrust(amt);
  }

  // Called from main on quarter-beat crossings
  onBeat() {
    this.sparkle = 0.2;
    if (this.pendingFlip) {
      this.activeSide = this.activeSide === "left" ? "right" : "left";
      this.pendingFlip = false;
      this.flipFlash = 0.25; // brief flash so the flip feels punctuated
    }
  }

  private alignmentStrength(): number {
    const target = { x: this.vp.w - this.witness.x, y: this.witness.y };
    const dx = target.x - this.witness.x,
      dy = target.y - this.witness.y;
    const len = Math.hypot(dx, dy) || 1;
    const toMirror = { x: dx / len, y: dy / len };
    const f = this.witness.facing;
    const dot = Math.max(-1, Math.min(1, f.x * toMirror.x + f.y * toMirror.y));
    const angle = Math.acos(dot); // radians
    const max = (30 * Math.PI) / 180; // within 30° counts as “aligned”
    return Math.max(0, 1 - angle / max); // 1 when angle<=0, fades to 0 by 30°
  }

  update(dt: number) {
    this.t += dt;
    this.phase = (this.phase + this.phaseSpeed * dt) % 1;

    this.witness.update(dt);

    const midX = this.vp.w / 2;
    // Arm flip when you cross to the other side; execute on next beat
    if (!this.pendingFlip) {
      if (this.activeSide === "left" && this.witness.x > midX)
        this.pendingFlip = true;
      if (this.activeSide === "right" && this.witness.x < midX)
        this.pendingFlip = true;
    }

    if (this.sparkle > 0) this.sparkle = Math.max(0, this.sparkle - dt);
    if (this.flipFlash > 0) this.flipFlash = Math.max(0, this.flipFlash - dt);
  }

  render(alpha: number) {
    const { ctx } = this;
    const { w, h } = this.vp;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(20,20,30,1)";
    ctx.fillRect(0, 0, w, h);

    // Mirror line styling: brighter when flip is pending; brief flash on flip
    const midX = w / 2;
    const baseA = 0.35;
    const armedPulse = this.pendingFlip ? 0.5 + 0.5 * Math.sin(this.t * 8) : 0;
    const lineA = Math.min(
      1,
      baseA + armedPulse * 0.4 + (this.flipFlash > 0 ? 0.45 : 0)
    );

    ctx.strokeStyle = `rgba(255,255,255,${lineA.toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();

    // Slight dim on the inactive side so the "active" side reads
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    if (this.activeSide === "left") {
      ctx.fillRect(midX, 0, midX, h);
    } else {
      ctx.fillRect(0, 0, midX, h);
    }
    ctx.restore();

    // Witness (real)
    this.witness.render(ctx);

    // Witness (mirror)
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    this.witness.render(ctx);
    ctx.restore();

    // Beat sparkle overlay
    if (this.sparkle > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.sparkle * 5);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    const a = this.alignmentStrength();
    if (a > 0) {
      const left = { x: this.witness.x, y: this.witness.y };
      const right = { x: this.vp.w - this.witness.x, y: this.witness.y };
      ctx.save();
      ctx.globalAlpha = a * a * 0.6; // gentle curve, never harsh
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}
