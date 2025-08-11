import { ChamberBase } from "./core/ChamberBase";

type EntityKind = "key" | "card";
type Entity = {
  kind: EntityKind;
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vr: number;
  born: number; ttl: number;  // seconds
  flash: number;              // 0..1 collect flash
};

export class RabbitHoleChamber extends ChamberBase {
  // sim
  private witness = new (class {
    x = 0; y = 0; vx = 0; vy = 0;
    facing = { x: 1, y: 0 };
    setFacing(dx: number, dy: number) {
      const m = Math.hypot(dx, dy) || 1; this.facing.x = dx / m; this.facing.y = dy / m;
    }
    thrust(a = 1) { this.vx += this.facing.x * 90 * a; this.vy += this.facing.y * 90 * a; }
    update(dt: number, bounds: { w: number; h: number }) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vx *= Math.pow(0.9, dt * 60); this.vy *= Math.pow(0.9, dt * 60);
      // keep in view
      const r = 10;
      this.x = Math.min(bounds.w - r, Math.max(r, this.x));
      this.y = Math.min(bounds.h - r, Math.max(r, this.y));
    }
  })();

  private entities: Entity[] = [];
  private g = 60;        // gravity px/s^2 downward
  private dragX = 0.9;   // horizontal damping factor per 60Hz
  private dragY = 0.98;  // vertical damping factor per 60Hz
  private t = 0;
  private sparkle = 0;

 constructor(canvas: HTMLCanvasElement, services?: any) {
     super(canvas, services);
     this.width = canvas.width;
this.height = canvas.height;
console.log("Chamber size:", this.width, this.height);
    const r = this.vp; this.witness.x = r.w * 0.5; this.witness.y = r.h * 0.7;

    // Wire beat spawns via services tempo if available
    console.log(this.services);
    console.log("that was services")
    this.services?.tempo?.onBeat("downbeat", () => this.spawnIf("key", 3, 8));
    this.services?.tempo?.onBeat("eighth",   () => this.spawnIf("card", 12, 6));
    // Gaze-on-beat collect on quarters (feels good)
    this.services?.tempo?.onBeat("quarter",  () => { this.onBeat(); this.tryCollect(); });
    
  }

  // ---- ChamberBase optional hooks API ----
  onBeat() { this.sparkle = 0.18; } // soft pulse
  setWitnessFacing(dx: number, dy: number) { this.witness.setFacing(dx, dy); }
  thrustWitness(a = 1) { this.witness.thrust(a); }
  getWitnessPos() { return { x: this.witness.x, y: this.witness.y }; }
  setPhaseSpeed(_: number) { /* not used here; visual cycle comes from tempo if needed */ }

  // ---- Spawning / Collecting ----
  private spawnIf(kind: EntityKind, maxCount: number, ttl: number) {
    const live = this.entities.filter(e => e.kind === kind && e.flash <= 0);
    if (live.length >= maxCount) return;
    this.entities.push(this.spawn(kind, ttl));
  }

  private spawn(kind: EntityKind, ttl: number): Entity {
    const { w, h } = this.vp;
    const now = this.t;
    const x = Math.random() * w;
    // spawn just below view; drift upward (falling “hole” illusion)
    const y = h + 20;
    const vy = - (20 + Math.random() * 30);
    const vx = (Math.random() - 0.5) * 30;
    const rot = 0; const vr = (Math.random() - 0.5) * 1.5;
    return { kind, x, y, vx, vy, rot, vr, born: now, ttl, flash: 0 };
  }

  private tryCollect() {
    // collect entities the witness is gazing at (angle + distance test)
    const cone = 20 * Math.PI / 180; // 20° cone
    const radius = 48;
    const f = this.witness.facing;

    for (const e of this.entities) {
      if (e.flash > 0) continue;
      const dx = e.x - this.witness.x, dy = e.y - this.witness.y;
      const dist = Math.hypot(dx, dy); if (dist > radius) continue;
      const m = dist || 1; const to = { x: dx / m, y: dy / m };
      const dot = Math.max(-1, Math.min(1, to.x * f.x + to.y * f.y));
      const ang = Math.acos(dot);
      if (ang <= cone) {
        e.flash = 1; // mark as collected; render will show a ring burst and we’ll cull soon
      }
    }
  }

  // ---- Update / Render ----
  update(dt: number) {
    this.t += dt;
    // gravity + drag
    for (const e of this.entities) {
      e.vy += this.g * dt;
      e.vx *= Math.pow(this.dragX, dt * 60);
      e.vy *= Math.pow(this.dragY, dt * 60);
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.rot += e.vr * dt;
      // lifetime
      if (this.t - e.born > e.ttl) e.flash = Math.max(e.flash, 0.001); // start fading if expired
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 2.5);
    }
    // cull offscreen & finished flashes
    const { w, h } = this.vp;
    this.entities = this.entities.filter(e => !(e.flash === 0 && (e.y < -40 || e.y > h + 80 || e.x < -80 || e.x > w + 80)) && e.flash > 0 || this.t - e.born <= e.ttl);
    // witness & pulse
    this.witness.update(dt, this.vp);
    if (this.sparkle > 0) this.sparkle = Math.max(0, this.sparkle - dt);
  }

  render(alpha: number) {
    const { ctx } = this; const { w, h } = this.vp;


    // background: falling dots for “hole” feel
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(16,18,28,1)");
    g.addColorStop(1, "rgba(8,10,16,1)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    this.parallaxDots(ctx, 24, 0.4);

    // entities
    for (const e of this.entities) {
      if (e.flash > 0) {
        // ring burst on collect
        const a = 1 - e.flash;
        ctx.save(); ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(e.x, e.y, (1 - e.flash) * 22 + 6, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1;
        ctx.stroke(); ctx.restore();
        continue;
      }
      ctx.save();
      ctx.translate(e.x, e.y); ctx.rotate(e.rot);
      if (e.kind === "key") {
        // simple key: bow + stem
       ctx.strokeStyle = "rgba(255,215,0,0.95)"; // gold-ish
ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3, 10); ctx.lineTo(3, 10); ctx.stroke();
      } else {
        // playing card rectangle with slight wobble
ctx.fillStyle = "rgba(255,255,255,0.95)";
ctx.fillRect(-10, -14, 20, 28);
ctx.strokeStyle = "rgba(220,40,40,0.9)";
ctx.lineWidth = 1.5;
ctx.strokeRect(-10, -14, 20, 28);
      }
      ctx.restore();
    }

    // witness (simple triangle + eye)
    this.renderWitness(ctx);

    // beat sparkle overlay
    if (this.sparkle > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.sparkle * 5);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // ---- visuals helpers ----
  private parallaxDots(ctx: CanvasRenderingContext2D, count = 20, slow = 0.4) {
    const { w, h } = this.vp;
    const t = this.t * slow;
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < count; i++) {
      const x = ((i * 97) % w);
      const y = (h + ((i * 53) % h) - (t * 30 + i * 15) % (h + 40));
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3 === 0 ? 0.8 : 0), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private renderWitness(ctx: CanvasRenderingContext2D) {
    const a = Math.atan2(-this.witness.facing.y, this.witness.facing.x);
    ctx.save();
    ctx.translate(this.witness.x, this.witness.y);
    ctx.rotate(a);
    // triangle body
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-10, -7); ctx.lineTo(-10, 7); ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
    // eye
    ctx.beginPath(); ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20,20,20,0.95)"; ctx.fill();
    ctx.restore();
  }
}
