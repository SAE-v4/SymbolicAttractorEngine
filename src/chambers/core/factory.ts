// src/chambers/core/factory.ts
import { ChamberBase } from "./ChamberBase";
import { ChamberDefinition } from "./defs";
import { WitnessNode } from "../../actors/WitnessNode";
import { crossed } from "../../utils/phaseUtils";

export function buildChamber(canvas: HTMLCanvasElement, def: ChamberDefinition): ChamberBase {
  // Return a tiny subclass composed from the definition
  class GeneratedChamber extends ChamberBase {
    private witness = new WitnessNode(() => this.canvas.getBoundingClientRect());
    private sparkle = 0; private phase = 0; private phaseSpeed = 0.05;
    private activeSide: "left"|"right" = "left"; private pendingFlip = false; private t = 0;

    constructor() { super(canvas); const b=this.canvas.getBoundingClientRect();
      this.witness.x=b.width/4; this.witness.y=b.height/2; }

    setPhaseSpeed(v:number){ this.phaseSpeed=v; }
    getWitnessPos(){ return { x:this.witness.x, y:this.witness.y }; }
    setWitnessFacing(dx:number,dy:number){
      if (def.rules.some(r=>r.kind==="mirror" && this.activeSide==="right")) dx = -dx;
      this.witness.setFacing(dx,dy);
    }
    thrustWitness(a=1){ this.witness.thrust(a); }

    private alignmentStrength(): number {
      if (!def.rules.find(r=>r.kind==="gazeAlign" && r.target==="mirrorSelf")) return 0;
      const target = { x: this.vp.w - this.witness.x, y: this.witness.y };
      const dx=target.x-this.witness.x, dy=target.y-this.witness.y;
      const len=Math.hypot(dx,dy)||1; const to={x:dx/len,y:dy/len};
      const f=this.witness.facing; const dot=Math.max(-1,Math.min(1,f.x*to.x+f.y*to.y));
      const tol=( (def.rules.find(r=>r.kind==="gazeAlign") as any)?.toleranceDeg ?? 18) * Math.PI/180;
      const ang=Math.acos(dot); return Math.max(0, 1 - ang/tol);
    }

    onBeat(){
      // sparkle pulse
      const gaze = this.alignmentStrength();
      const scale = (def.rules.find(r=>r.kind==="gazeAlign") as any)?.flashScale ?? 0.45;
      this.sparkle = Math.max(this.sparkle, 0.18 + scale*gaze);

      // flip on armed beat
      if (this.pendingFlip && def.rules.some(r=>r.kind==="mirror")) {
        this.activeSide = this.activeSide==="left"?"right":"left";
        this.pendingFlip = false;
      }
    }

    update(dt:number){
      this.t += dt;
      this.phase = (this.phase + this.phaseSpeed*dt) % 1;

      // arm flip when crossing midline
      const hasMirror = def.rules.some(r=>r.kind==="mirror");
      if (hasMirror) {
        const mid = this.vp.w/2;
        if (!this.pendingFlip) {
          if (this.activeSide==="left" && this.witness.x>mid) this.pendingFlip=true;
          if (this.activeSide==="right"&& this.witness.x<mid) this.pendingFlip=true;
        }
      }

      this.witness.update(dt);
      if (this.sparkle>0) this.sparkle=Math.max(0,this.sparkle-dt);
    }

    render(alpha:number){
      const { ctx } = this; const { w,h } = this.vp;
      ctx.clearRect(0,0,w,h);

      // visuals from def
      if (def.visuals.find(v=>v.kind==="bgGradient")){
        const g=ctx.createLinearGradient(0,0,0,h);
        const day = Math.sin(this.phase*Math.PI*2)*0.5+0.5;
        g.addColorStop(0, `rgba(${Math.floor(40+140*day)}, ${Math.floor(90+100*day)}, 255, 1)`);
        g.addColorStop(1, `rgba(10,10,${Math.floor(50+100*day)},1)`); ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      }

      if (def.visuals.find(v=>v.kind==="mirrorLine")) {
        const mid=w/2; ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.moveTo(mid,0); ctx.lineTo(mid,h); ctx.stroke();
      }

      // dim inactive side
      if (def.visuals.find(v=>v.kind==="mirrorLine")) {
        ctx.save(); ctx.fillStyle="rgba(255,255,255,0.04)";
        const mid=w/2; this.activeSide==="left" ? ctx.fillRect(mid,0,mid,h) : ctx.fillRect(0,0,mid,h);
        ctx.restore();
      }

      // witness + mirror
      this.witness.render(ctx);
      ctx.save(); ctx.translate(w,0); ctx.scale(-1,1); this.witness.render(ctx); ctx.restore();

      // sparkle
      if (this.sparkle>0){ ctx.save(); ctx.globalAlpha=Math.min(1,this.sparkle*5);
        ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.fillRect(0,0,w,h); ctx.restore(); }
    }
  }

  return new GeneratedChamber();
}
