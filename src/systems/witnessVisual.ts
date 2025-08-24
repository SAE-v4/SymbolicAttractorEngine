// systems/witnessVisual.ts
import { PAL } from "@config/palette";
import type { ChamberDef } from "@types/ChamberDef";

export class WitnessVisual {
  private flash = 0; // 0..1
  constructor(private def:ChamberDef){}

  onBeat(){ // call when phase crosses 0 within beatWidth
    this.flash = Math.min(1, this.flash + this.def.witness!.flash.gain);
  }
  tick(dt:number){ // decay
    const d = this.def.witness!.flash.decay;
    this.flash = Math.max(0, this.flash - dt*d);
  }

  draw(g:CanvasRenderingContext2D, x:number, y:number, phase:number){
    const pal = PAL(this.def);
    const w = this.def.witness!;
    const p = (Math.sin((phase)*Math.PI*2)*0.5+0.5);
    const r = w.aura.rBase + w.aura.rGain*p + 24*this.flash;
    const a = w.aura.aBase + w.aura.aGain*p + 0.25*this.flash;

    g.save();
    g.globalCompositeOperation = "lighter";
    const rg = g.createRadialGradient(x,y,0, x,y, r);
    rg.addColorStop(0, pal.css("spiral", a));
    rg.addColorStop(1, pal.css("spiral", 0));
    g.fillStyle = rg;
    g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();

    // seed bead
    g.fillStyle = pal.css("solarCore", 0.9);
    g.beginPath(); g.arc(x,y, 3.5 + 1.5*p, 0, Math.PI*2); g.fill();
    g.restore();
  }
}
