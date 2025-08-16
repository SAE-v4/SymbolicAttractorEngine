// chambers/flow/SpiralGateChamber.ts
import { Services } from "../core/Services";
import { FlowGate } from "./FlowGate"; // adjust relative path if needed

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
  private readonly accel = 900; // px/s^2 at thrust=1
  private readonly maxSpeed = 600; // px/s
  private readonly damping = 0.92; // velocity decay per second (applied frame-wise)

  private baseScale = 1200; // reference viewport size
  private scale = 1;

  private assistLevel = 0.0; // 0..1 (0 = expert, 1 = very friendly)

  private beginnerPos: Vec2 = { x: 0, y: 0 };
  private beginnerVel: Vec2 = { x: 0, y: 0 };
  private beginnerFacing: Vec2 = { x: 1, y: 0 };
  private beginnerThrustAmt = 0;

  private gate!: FlowGate;
  private showDebug = false;

  // SpiralGateChamber.ts (add fields)
private openBloom = 0; // 0..1, visual celebration
private chimePlayedAt = -1;

  constructor(private canvas: HTMLCanvasElement, services: Services) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;
    this.services = services;

    this.handleResize();
    addEventListener("resize", () => this.handleResize());

    const friendliness = 1 - 0.6 * this.assistLevel; // assist 0→friendly 1.0, assist 1→friendly 0.4
    this.gate = new FlowGate(
      { x: this.width * 0.5, y: this.height * 0.5 },
      () => this.services.tempo.phase?.() ?? 0,
      /* dir */ 1, // CCW or -1 for CW
      friendliness
    );
    addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "d") this.showDebug = !this.showDebug;
    });

    const isSmall = Math.min(window.innerWidth, window.innerHeight) < 900;
    this.assistLevel = isSmall ? 0.6 : 0.2;

    // Start witness in center
    this.witnessPos = { x: this.width * 0.5, y: this.height * 0.5 };
    this.beginnerPos = { x: this.width * 0.25, y: this.height * 0.5 };
  }

  // Track steering intent for breath latch
  private _steeringTimer = 0;

  // --- API expected by controls ---
  public getWitnessPos(): Vec2 {
    return this.witnessPos;
  }

  public setWitnessFacing(dx: number, dy: number) {
    const n = norm({ x: dx, y: dy });
    this.witnessFacing = n;
    this._steeringTimer = 0.2; // 200ms grace after any facing input
  }
  public thrustWitness(amount01: number) {
    // clamp to [0,1]
    this.thrustAmt = clamp(amount01, 0, 1);
    this.beginnerThrustAmt = this.thrustAmt;
  }

  // --- Pulses (optional for now) ---
  public onBeat?(): void;

  // --- Sim/update ---
  // --- update(dt): edge assist + breath latch + optional containment ---
  public update(dt: number) {
    // Base physics (same as you have)
    const ax = this.witnessFacing.x * this.accel * this.thrustAmt;
    const ay = this.witnessFacing.y * this.accel * this.thrustAmt;
    this.witnessVel.x += ax * dt;
    this.witnessVel.y += ay * dt;

    // Global damping
    const dampingPerFrame = Math.pow(this.damping, dt);
    this.witnessVel.x *= dampingPerFrame;
    this.witnessVel.y *= dampingPerFrame;

    // --- Assist 1: soft edge bias & extra damping ---
    if (this.assistLevel > 0) {
      const edgeCushion =
        Math.min(this.width, this.height) * (0.18 - 0.08 * this.assistLevel); // 18%→10%
      const dl = this.witnessPos.x,
        dr = this.width - this.witnessPos.x;
      const dtp = this.witnessPos.y,
        db = this.height - this.witnessPos.y;
      const distToEdge = Math.min(dl, dr, dtp, db);
      const edgeProx = Math.max(0, 1 - distToEdge / edgeCushion); // 0..1

      if (edgeProx > 0) {
        const toward = norm({
          x: this.width * 0.5 - this.witnessPos.x,
          y: this.height * 0.5 - this.witnessPos.y,
        });
        const pull = (120 + 240 * this.assistLevel) * edgeProx * this.scale;
        this.witnessVel.x += toward.x * pull * dt;
        this.witnessVel.y += toward.y * pull * dt;

        // extra damping toward edge
        const extra = 1 - (0.18 + 0.25 * this.assistLevel) * edgeProx * dt;
        this.witnessVel.x *= extra;
        this.witnessVel.y *= extra;
      }
    }

    // Clamp speed
    const speed = Math.hypot(this.witnessVel.x, this.witnessVel.y);
    if (speed > this.maxSpeed) {
      const k = this.maxSpeed / speed;
      this.witnessVel.x *= k;
      this.witnessVel.y *= k;
    }

    // Integrate position
    this.witnessPos.x += this.witnessVel.x * dt;
    this.witnessPos.y += this.witnessVel.y * dt;

    // --- Assist 2: soft contain (reduce wrap confusion) ---
    if (this.assistLevel >= 0.5) {
      // contain to edges softly
      this.witnessPos.x = Math.max(0, Math.min(this.width, this.witnessPos.x));
      this.witnessPos.y = Math.max(0, Math.min(this.height, this.witnessPos.y));
    } else {
      // keep your torus wrap
      this.wrap(this.witnessPos);
    }

    // --- Assist 3: breath latch when steering (ease thrust toward target) ---
    this._steeringTimer = Math.max(0, this._steeringTimer - dt);
    if (this.assistLevel > 0) {
      const targetT = this.gate?.readout.targetThrust ?? 0.5;
      const steering = this._steeringTimer > 0;
      const easeRate = steering ? 1.2 + 2.0 * this.assistLevel : 0; // per-sec
      if (easeRate > 0) {
        const t = Math.exp(-easeRate * dt);
        this.thrustAmt = this.thrustAmt * t + targetT * (1 - t);
      }
    }

    // Beginner node update if you kept it
    if (this.updateBeginner) this.updateBeginner(dt as any);

    // Gate update (unchanged)
    this.gate.update(
      dt,
      this.witnessPos,
      { x: this.witnessVel.x, y: this.witnessVel.y },
      { x: this.witnessFacing.x, y: this.witnessFacing.y },
      this.thrustAmt
    );
    if (this.gate.consumeJustOpened()) {
  // 2.2s grace where the ring won’t immediately collapse
  this.gate.setLatch(2.2);
  this.openBloom = 1;

  // (optional) play a chime once
 // this.playGateChime?.();
 // decay bloom
if (this.openBloom > 0) {
  const k = Math.exp(-2.4 * dt);
  this.openBloom *= k;
}
}
  }

  private updateWitness(dt: number) {
    // existing inertial witness physics
    const ax = this.witnessFacing.x * this.accel * this.thrustAmt;
    const ay = this.witnessFacing.y * this.accel * this.thrustAmt;
    this.witnessVel.x += ax * dt;
    this.witnessVel.y += ay * dt;
    const dampingPerFrame = Math.pow(this.damping, dt);
    this.witnessVel.x *= dampingPerFrame;
    this.witnessVel.y *= dampingPerFrame;
    const speed = len(this.witnessVel);
    if (speed > this.maxSpeed) {
      const k = this.maxSpeed / speed;
      this.witnessVel.x *= k;
      this.witnessVel.y *= k;
    }
    this.witnessPos.x += this.witnessVel.x * dt;
    this.witnessPos.y += this.witnessVel.y * dt;
    this.wrap(this.witnessPos);
  }

  public render(_alpha: number) {
    const phase = this.services.tempo.phase?.() ?? 0;
    this.drawBreathingBackground(phase);
    this.drawGateVisual();
    if (this.drawBeginner) this.drawBeginner();
    this.drawWitness();
    this.drawDebug();
  }


  // SpiralGateChamber.ts
private audio?: AudioContext;

private ensureAudio() {
  if (!this.audio) this.audio = new (window.AudioContext || (window as any).webkitAudioContext)();
}

private playGateChime() {
  this.ensureAudio(); if (!this.audio) return;
  const ctx = this.audio;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sine";     osc1.frequency.setValueAtTime(740, now);  // F#5
  osc2.type = "sine";     osc2.frequency.setValueAtTime(880, now);  // A5
  gain.gain.setValueAtTime(0.0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.6);

  osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
  osc1.start(now); osc2.start(now);
  osc1.stop(now + 0.65); osc2.stop(now + 0.65);
}


  private updateBeginner(dt: number) {
    // beginner gets strong damping + mild spiral bias
    const biasCenter: Vec2 = { x: this.width * 0.5, y: this.height * 0.5 };
    const toCenter = norm({
      x: biasCenter.x - this.beginnerPos.x,
      y: biasCenter.y - this.beginnerPos.y,
    });

    const ax =
      this.beginnerFacing.x * this.accel * this.beginnerThrustAmt +
      toCenter.x * 50;
    const ay =
      this.beginnerFacing.y * this.accel * this.beginnerThrustAmt +
      toCenter.y * 50;

    this.beginnerVel.x += ax * dt;
    this.beginnerVel.y += ay * dt;

    const dampingPerFrame = Math.pow(0.75, dt); // heavier damping
    this.beginnerVel.x *= dampingPerFrame;
    this.beginnerVel.y *= dampingPerFrame;

    const maxBeginnerSpeed = 400;
    const speed = len(this.beginnerVel);
    if (speed > maxBeginnerSpeed) {
      const k = maxBeginnerSpeed / speed;
      this.beginnerVel.x *= k;
      this.beginnerVel.y *= k;
    }

    this.beginnerPos.x += this.beginnerVel.x * dt;
    this.beginnerPos.y += this.beginnerVel.y * dt;
    this.wrap(this.beginnerPos);
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
      const alpha = 0.08 + 0.1 * Math.max(0, s);
      g.fillStyle = `rgba(200,210,255, ${alpha})`;
      const y0 = t * h;
      g.fillRect(0, y0 - 8, w, 16);
    }

    // reset
    g.globalCompositeOperation = "source-over";
  }

  private wrap(v: Vec2) {
    if (v.x < 0) v.x += this.width;
    if (v.y < 0) v.y += this.height;
    if (v.x >= this.width) v.x -= this.width;
    if (v.y >= this.height) v.y -= this.height;
  }

  private drawWitness() {
    const g = this.ctx;
    const { x, y } = this.witnessPos;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(this.witnessFacing.x * 24, this.witnessFacing.y * 24);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(20,40,120,0.7)";
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 8 + this.thrustAmt * 6, 0, Math.PI * 2);
    g.fillStyle = "rgba(20,40,120,0.9)";
    g.fill();
    // in drawWitness()
g.shadowColor = "rgba(20,40,120,0.35)";
g.shadowBlur = 16;
g.beginPath(); g.arc(0, 0, 8 + this.thrustAmt * 6, 0, Math.PI*2); g.fill();

g.beginPath();
g.moveTo(0, 0);
g.lineTo(-this.witnessVel.x * 0.06, -this.witnessVel.y * 0.06);
g.lineWidth = 2;
g.strokeStyle = "rgba(20,40,120,0.35)";
g.stroke();
g.shadowBlur = 0;
    g.restore();
  }

  private drawBeginner() {
    const g = this.ctx;
    const { x, y } = this.beginnerPos;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(this.beginnerFacing.x * 24, this.beginnerFacing.y * 24);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(120,40,20,0.7)";
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 8 + this.beginnerThrustAmt * 6, 0, Math.PI * 2);
    g.fillStyle = "rgba(200,80,60,0.85)";
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

    // Viewport scale (clamped for sanity)
    this.scale = Math.max(
      0.6,
      Math.min(1.6, Math.min(this.width, this.height) / this.baseScale)
    );

    // Retune physics by scale
    this.accel = 900 * this.scale;
    this.maxSpeed = 600 * this.scale;
  }

private drawGateVisual() {
  const g = this.ctx;
  const { progress } = this.gate.readout;
  const cx = this.width*0.5, cy = this.height*0.5;

  const baseR = Math.min(this.width, this.height) * 0.18;
  const r = baseR + progress * baseR * 0.9;

  // ring
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI*2);
  g.lineWidth = 6 + 12 * progress + 10 * this.openBloom;
  g.strokeStyle = `rgba(40,80,200, ${0.35 + 0.4*progress + 0.25*this.openBloom})`;
  g.stroke();

  // glow (beefed up by bloom)
  const rg = g.createRadialGradient(cx, cy, r*0.6, cx, cy, r*1.6 + 40*this.openBloom);
  rg.addColorStop(0, `rgba(150,180,255, ${0.18 + 0.34*progress + 0.25*this.openBloom})`);
  rg.addColorStop(1, `rgba(150,180,255, 0)`);
  g.globalCompositeOperation = "lighter";
  g.fillStyle = rg;
  g.beginPath(); g.arc(cx, cy, r*1.6 + 40*this.openBloom, 0, Math.PI*2); g.fill();
  g.restore();

  g.globalCompositeOperation = "source-over";
}


  private drawDebug() {
    const g = this.ctx;
    const dpr = devicePixelRatio || 1;
    const { sAlign, sCoherent, sBreath, targetThrust, tangent, progress } =
      this.gate.readout;

    // vectors at witness
    g.save();
    g.translate(this.witnessPos.x, this.witnessPos.y);

    // velocity
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(this.witnessVel.x * 0.15, this.witnessVel.y * 0.15);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(30,150,80,0.9)";
    g.stroke();

    // accelDir (facing)
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(this.witnessFacing.x * 40, this.witnessFacing.y * 40);
    g.lineWidth = 2;
    g.strokeStyle = "rgba(200,120,30,0.9)";
    g.stroke();

    // spiral tangent
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(tangent.x * 48, tangent.y * 48);
    g.lineWidth = 2;
    g.setLineDash([6, 4]);
    g.strokeStyle = "rgba(40,80,200,0.9)";
    g.stroke();

    
    g.restore();

    // text HUD (top-left)
    g.save();
    g.font = `${12 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(10 * dpr, 10 * dpr, 210 * dpr, 84 * dpr);
    g.fillStyle = "white";
    g.fillText(`Align:   ${sAlign.toFixed(2)}`, 18 * dpr, 28 * dpr);
    g.fillText(`Coher.:  ${sCoherent.toFixed(2)}`, 18 * dpr, 44 * dpr);
    g.fillText(`Breath:  ${sBreath.toFixed(2)}`, 18 * dpr, 60 * dpr);
    g.fillText(`TargetT: ${targetThrust.toFixed(2)}`, 18 * dpr, 76 * dpr);
    g.fillText(`Gate ▣ ${Math.round(progress * 100)}%`, 18 * dpr, 92 * dpr);
    g.restore();
  }
}
