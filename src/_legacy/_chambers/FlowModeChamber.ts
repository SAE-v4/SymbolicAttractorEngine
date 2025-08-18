// src/chambers/flow/FlowModeChamber.ts
import { ChamberBase } from "../../_legacy/_chambers/core/ChamberBase";
import { PhaseFX } from "../../_legacy/vis/phaseFX";

export class FlowModeChamber extends ChamberBase {
  private fx: PhaseFX;

  constructor(canvas: HTMLCanvasElement, services: any) {
    super(canvas, services);
    const getPhase = () => this.services?.tempo?.phase?.() ?? 0;
    this.fx = new PhaseFX(getPhase, { baseA: 0.05, breathDepth: 0.45, rippleDecay: 0.5 });

    // beat pops
    this.services?.tempo?.onBeat("quarter", () => {
      this.fx.onBeat();
      this.onBeat?.();
    });
  }

  update(dt: number) {
    // your movement, glyphs, etc...
    this.fx.update(dt);
  }

  render(alpha: number) {
    const { ctx } = this; const { w, h } = this.vp;

    // 1) Breathing gradient background
    const b = this.fx.breath(); // 0..1
    const top = lerpColor([20,28,48], [35,65,120], b);
    const bot = lerpColor([8,12,20],  [12,20,36],  b);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgb(${top.join(",")})`);
    g.addColorStop(1, `rgb(${bot.join(",")})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 2) Beat ripple (radial) centered on canvas (or move with witness)
    const cx = w * 0.5, cy = h * 0.5;
    const rippleA = this.fx.overlayAlpha(1.0);
    if (rippleA > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = rippleA;
      const r0 = Math.min(w, h) * 0.15;
      const r1 = Math.min(w, h) * (0.15 + 0.6 * (1 - this.fx.overlayAlpha(0.6))); // expands as ripple decays
      const rg = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
      rg.addColorStop(0.0, "rgba(255,255,255,0.20)");
      rg.addColorStop(0.5, "rgba(255,255,255,0.10)");
      rg.addColorStop(1.0, "rgba(255,255,255,0.00)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 3) Phase-tinted vignette (subtle)
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.12 * b;
    const vg = ctx.createRadialGradient(cx, cy, Math.min(w,h)*0.2, cx, cy, Math.max(w,h)*0.8);
    vg.addColorStop(0, "rgba(0,0,0,0.0)");
    vg.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = vg; ctx.fillRect(0,0,w,h);
    ctx.restore();

    // 4) (Optional) Path/corridor glow: brighten by facing·tangent alignment
    // compute 'align' in your path code: 0..1
    // draw a soft line along the current corridor scaled by (0.15 + 0.5*align)

    // …then draw witness, glyphs, collectibles…
  }
}

// tiny util
function lerp(a:number, b:number, t:number){ return a + (b-a)*t; }
function lerpColor(c0:number[], c1:number[], t:number){
  return [Math.round(lerp(c0[0],c1[0],t)), Math.round(lerp(c0[1],c1[1],t)), Math.round(lerp(c0[2],c1[2],t))];
}
