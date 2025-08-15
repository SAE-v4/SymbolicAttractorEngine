// chambers/flow/SpiralGateChamber.ts
import { Services } from "../core/Services";

type Vec2 = { x: number; y: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function len(v: Vec2) {
  return Math.hypot(v.x, v.y);
}
function norm(v: Vec2): Vec2 {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}

export class SpiralGateChamber {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private services: Services;

  // --- Witness state ---
  private witnessPos: Vec2 = { x: 0, y: 0 };
  private witnessVel: Vec2 = { x: 0, y: 0 };
  private witnessFacing: Vec2 = { x: 1, y: 0 }; // unit vector
  private thrustAmt = 0;

  // tuning
  private readonly accel = 900;       // px/s^2 at thrust=1
  private readonly maxSpeed = 600;    // px/s
  private readonly damping = 0.92;    // velocity decay per second (applied frame-wise)

  constructor(private canvas: HTMLCanvasElement, services: Services) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;
    this.services = services;

    this.handleResize();
    addEventListener("resize", () => this.handleResize());

    // Start witness in center
    this.witnessPos = { x: this.width * 0.5, y: this.height * 0.5 };
  }

  // --- API expected by controls ---
  public getWitnessPos(): Vec2 {
    return this.witnessPos;
  }
  public setWitnessFacing(dx: number, dy: number) {
    const n = norm({ x: dx, y: dy });
    this.witnessFacing = n;
  }
  public thrustWitness(amount01: number) {
    // clamp to [0,1]
    this.thrustAmt = clamp(amount01, 0, 1);
  }

  // --- Pulses (optional for now) ---
  public onBeat?(): void;

  // --- Sim/update ---
  public update(dt: number) {
    // integrate acceleration from facing * thrust
    const ax = this.witnessFacing.x * this.accel * this.thrustAmt;
    const ay = this.witnessFacing.y * this.accel * this.thrustAmt;

    this.witnessVel.x += ax * dt;
    this.witnessVel.y += ay * dt;

    // damping (approximate continuous damping per second)
    const dampingPerFrame = Math.pow(this.damping, dt);
    this.witnessVel.x *= dampingPerFrame;
    this.witnessVel.y *= dampingPerFrame;

    // clamp speed
    const speed = len(this.witnessVel);
    if (speed > this.maxSpeed) {
      const k = this.maxSpeed / (speed || 1);
      this.witnessVel.x *= k;
      this.witnessVel.y *= k;
    }

    // integrate position
    this.witnessPos.x += this.witnessVel.x * dt;
    this.witnessPos.y += this.witnessVel.y * dt;

    // wrap (torus) so we always stay in-bounds
    if (this.witnessPos.x < 0) this.witnessPos.x += this.width;
    if (this.witnessPos.y < 0) this.witnessPos.y += this.height;
    if (this.witnessPos.x >= this.width) this.witnessPos.x -= this.width;
    if (this.witnessPos.y >= this.height) this.witnessPos.y -= this.height;
  }

  // --- Render ---
  public render(_alpha: number) {
    // 1) Your breathing background (phaseFX) goes here:
    //    If you already render it somewhere else, keep that and leave this section as-is.
    const t = this.services.tempo.phase?.() ?? 0;
    this.drawBreathingBackground(t);

    // 2) Draw witness on top
    this.drawWitness();
  }

private drawBreathingBackground(phase: number) {
  const g = this.ctx;
  const w = this.width;
  const h = this.height;

  // clear
  g.clearRect(0, 0, w, h);

  // BASE gradient (stronger)
  const base = g.createLinearGradient(0, 0, 0, h);
  // intensity cycles 0.15..0.85 for visible change
  const i = 0.5 + 0.35 * Math.sin(phase * Math.PI * 2);
  base.addColorStop(0, `rgba(170,190,255, ${0.55 + 0.25 * i})`);
  base.addColorStop(1, `rgba(235,242,255, ${0.65})`);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  // RADIAL “breath” centered
  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxR = Math.hypot(w, h) * 0.55;
  const p = (Math.sin(phase * Math.PI * 2) + 1) * 0.5; // 0..1
  const r = maxR * (0.65 + 0.25 * p); // expand/contract a bit

  const rg = g.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
  rg.addColorStop(0, `rgba(255,255,255, ${0.22 + 0.18 * p})`);
  rg.addColorStop(1, `rgba(255,255,255, 0)`);
  g.globalCompositeOperation = "lighter";
  g.fillStyle = rg;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();

  // SOFT BANDS (phase-swept)
  g.globalCompositeOperation = "overlay";
  const rows = 9;
  for (let y = 0; y < rows; y++) {
    const t = y / (rows - 1);
    const s = Math.sin(phase * Math.PI * 2 + t * Math.PI * 2);
    const alpha = 0.08 + 0.10 * Math.max(0, s);
    g.fillStyle = `rgba(200,210,255, ${alpha})`;
    const y0 = t * h;
    g.fillRect(0, y0 - 8, w, 16);
  }

  // reset
  g.globalCompositeOperation = "source-over";
}


  private drawWitness() {
    const g = this.ctx;
    const { x, y } = this.witnessPos;

    // facing line
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(this.witnessFacing.x * 24, this.witnessFacing.y * 24);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(20,40,120,0.7)";
    g.stroke();

    // dot
    g.beginPath();
    g.arc(0, 0, 8 + this.thrustAmt * 6, 0, Math.PI * 2);
    g.fillStyle = "rgba(20,40,120,0.9)";
    g.fill();

    g.restore();
  }

  private handleResize() {
    const dpr = devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width * dpr));
    this.height = Math.max(1, Math.floor(rect.height * dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // If you also need CSS size, ensure the canvas is styled via CSS to fill.
  }
}
