// systems/gate/gateFlash.ts
import { PAL } from "@/config/palette";
import type { ChamberDef } from "@/types/ChamberDefs";

export class GateFlash {
  private def: ChamberDef;
  private flash = 0;          // 0..1 bloom intensity
  private sweep = 0;          // 0..1 arc visibility
  private angle = -Math.PI/2; // start at top
  private tPrev = 0;

  constructor(def: ChamberDef){ this.def = def; }

  onBeat() {
    this.flash = Math.min(1, this.flash + 0.7);   // bloom gain
    this.sweep = 1;                               // show arc
    this.angle = -Math.PI/2;                      // reset to top
  }

  tick(dt:number) {
    // decay
    this.flash = Math.max(0, this.flash - 2.6*dt);
    this.sweep = Math.max(0, this.sweep - 1.8*dt);
    // sweep rotates even as it fades
    this.angle += 1.8 * Math.PI * dt; // ~0.9 rev/sec
  }

  draw(g:CanvasRenderingContext2D, cx:number, cy:number, r:number){
    const pal = PAL(this.def);

    // outer bloom halo (large, very soft)
    if (this.flash > 1e-3) {
      g.save();
      g.globalCompositeOperation = "lighter";
      const R = Math.max(g.canvas.width, g.canvas.height) * (0.42 + 0.25*this.flash);
      const rg = g.createRadialGradient(cx,cy, r*0.2, cx,cy, R);
      rg.addColorStop(0, pal.css("ring", 0.22*this.flash));
      rg.addColorStop(1, pal.css("ring", 0.0));
      g.fillStyle = rg;
      g.beginPath(); g.arc(cx,cy,R,0,Math.PI*2); g.fill();
      g.restore();
    }

    // bright arc sweep along the ring
    if (this.sweep > 1e-3) {
      g.save();
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = pal.css("ring", 0.75 * this.sweep);
      g.lineCap = "round";
      g.lineWidth = 8 + 10*this.sweep;
      const span = 0.55; // radians
      g.beginPath();
      g.arc(cx, cy, r*0.98, this.angle - span*0.5, this.angle + span*0.5, false);
      g.stroke();
      g.restore();
    }
  }
}
