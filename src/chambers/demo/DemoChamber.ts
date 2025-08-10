import { WitnessNode } from "../../actors/WitnessNode";

export class DemoChamber {
  // simple solar phase [0..1)
  public phase = 0;
  private phaseSpeed = 0.05; // cycles per second
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private witness: WitnessNode;
  private sparkle = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("2D context not available");
    this.ctx = c;
    this.resize();
    addEventListener("resize", () => this.resize(), { passive: true });
  }

  setPhaseSpeed(cyclesPerSecond: number) { this.phaseSpeed = cyclesPerSecond; }

  update(dt: number) {
    this.phase = (this.phase + this.phaseSpeed * dt) % 1;
  }

  // Return true when phase crosses a beat grid (e.g., quarter-beats)
  public crossed(thresholds: number[], prevPhase: number, currPhase: number): number | null {
    for (const t of thresholds) {
      const c = (prevPhase <= t && currPhase >= t) ||
                (prevPhase > currPhase && (currPhase >= t || prevPhase <= t)); // wrap
      if (c) return t;
    }
    return null;
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
  }

  private resize() {
    const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}
