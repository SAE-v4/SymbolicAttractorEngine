export class WitnessNode {
  x = 0; y = 0;
  vx = 0; vy = 0;
  speed = 90;           // px/s
  damping = 0.9;        // simple air drag
  facing = { x: 1, y: 0 };

  constructor(public bounds: () => DOMRect) {}

  setFacing(dx: number, dy: number) {
    const len = Math.hypot(dx, dy) || 1;
    this.facing.x = dx / len; this.facing.y = dy / len;
  }

  thrust(amount = 1) {
    this.vx += this.facing.x * this.speed * amount;
    this.vy += this.facing.y * this.speed * amount;
  }

  update(dt: number) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= Math.pow(this.damping, dt * 60);
    this.vy *= Math.pow(this.damping, dt * 60);

    // keep on-canvas
    const r = 10, b = this.bounds();
    this.x = Math.min(b.width - r, Math.max(r, this.x));
    this.y = Math.min(b.height - r, Math.max(r, this.y));
  }

  render(ctx: CanvasRenderingContext2D) {
    const angle = Math.atan2(-this.facing.y, this.facing.x);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // body (triangle)
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-10, -7);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();

    // eye
    ctx.beginPath();
    ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20,20,20,0.95)";
    ctx.fill();

    ctx.restore();
  }
}
