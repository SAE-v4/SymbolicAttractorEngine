export type Vec2 = { x:number; y:number };

const clamp01 = (v:number)=>Math.max(0,Math.min(1,v));

export class MotionSystem {
  pos: Vec2 = { x: 0, y: 0 };
  vel: Vec2 = { x: 0, y: 0 };
  facing: Vec2 = { x: 1, y: 0 };
  thrust = 0;

  private accel = 900;
  private maxSpeed = 600;
  private damping = 0.92;
  private width = 1;
  private height = 1;
  private steeringTimer = 0;

  constructor(private opts:{accel?:number;maxSpeed?:number;damping?:number} = {}) {
    if (opts.accel) this.accel = opts.accel;
    if (opts.maxSpeed) this.maxSpeed = opts.maxSpeed;
    if (opts.damping) this.damping = opts.damping;
  }

  resize(w:number,h:number) {
    this.width=w; this.height=h;
    this.pos = { x: w*0.5, y: h*0.5 };
  }

  setFacing(dx:number,dy:number) {
    const L = Math.hypot(dx,dy) || 1;
    this.facing = { x: dx/L, y: dy/L };
    this.steeringTimer = 0.22;
  }
  setThrust(t:number) { this.thrust = clamp01(t); }

  update(dt:number, contain=true) {
    // accel
    this.vel.x += this.facing.x * this.accel * this.thrust * dt;
    this.vel.y += this.facing.y * this.accel * this.thrust * dt;
    // base damping
    const k = Math.pow(this.damping, dt);
    this.vel.x *= k; this.vel.y *= k;
    // extra damping when not steering
    this.steeringTimer = Math.max(0, this.steeringTimer - dt);
    if (!this.steeringTimer) {
      const extra = Math.exp(-1.6 * dt);
      this.vel.x *= extra; this.vel.y *= extra;
    }
    // clamp speed
    const s = Math.hypot(this.vel.x, this.vel.y);
    if (s > this.maxSpeed) { const c = this.maxSpeed/s; this.vel.x*=c; this.vel.y*=c; }

    // integrate
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt;

    // contain or wrap
    if (contain) {
      this.pos.x = Math.max(0, Math.min(this.width,  this.pos.x));
      this.pos.y = Math.max(0, Math.min(this.height, this.pos.y));
    } else {
      if (this.pos.x < 0) this.pos.x += this.width;
      if (this.pos.y < 0) this.pos.y += this.height;
      if (this.pos.x >= this.width) this.pos.x -= this.width;
      if (this.pos.y >= this.height) this.pos.y -= this.height;
    }
  }
}
