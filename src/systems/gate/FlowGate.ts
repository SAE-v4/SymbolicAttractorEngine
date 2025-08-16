export type Vec2 = { x:number; y:number };
const clamp01 = (v:number)=>Math.max(0,Math.min(1,v));
const dot = (a:Vec2,b:Vec2)=>a.x*b.x + a.y*b.y;
const norm = (v:Vec2)=>{ const L=Math.hypot(v.x,v.y)||1; return {x:v.x/L,y:v.y/L}; };
const rot90 = (v:Vec2)=>({x:-v.y,y:v.x});
const rotNeg90 = (v:Vec2)=>({x:v.y,y:-v.x});

export type FlowReadout = {
  progress:number; sAlign:number; sCoherent:number; sBreath:number;
  targetThrust:number; tangent:Vec2;
};

export class FlowGate {
  private progress=0; private wasOpen=false;
  private center:Vec2; private phaseFn:()=>number; private dir:1|-1;
  private openThreshold=0.68; private openSeconds=1.9; private decayPerSec=0.16;
  private breathMid=0.5; private breathDepth=0.4; private breathTolerance=0.22;
  readout:FlowReadout = { progress:0,sAlign:0,sCoherent:0,sBreath:0,targetThrust:0.5,tangent:{x:1,y:0} };

  constructor(center:Vec2, phaseFn:()=>number, dir:1|-1=1) {
    this.center=center; this.phaseFn=phaseFn; this.dir=dir;
  }
  private tangentAt(p:Vec2){ const radial=norm({x:this.center.x-p.x,y:this.center.y-p.y});
    return this.dir===1? rot90(radial): rotNeg90(radial); }
  update(dt:number, pos:Vec2, vel:Vec2, accelDir:Vec2, thrust:number){
    const vHat = Math.hypot(vel.x,vel.y)>0? norm(vel): {x:0,y:0};
    const tHat = this.tangentAt(pos);
    const sAlign = clamp01((dot(vHat,tHat)-0.5)/0.5);

    const aHat = norm(accelDir);
    const sCoherent = clamp01((dot(vHat,aHat)-0.3)/0.7);

    const phase = this.phaseFn()||0;
    const target = this.breathMid + this.breathDepth * Math.sin(phase*Math.PI*2);
    const sBreath = clamp01(1 - Math.abs(thrust - target)/this.breathTolerance);

    const combined = 0.6*sAlign + 0.25*sBreath + 0.15*sCoherent;

    if (combined >= this.openThreshold) this.progress += dt/this.openSeconds;
    else this.progress -= this.decayPerSec*dt;
    this.progress = clamp01(this.progress);

    this.readout = { progress:this.progress, sAlign, sCoherent, sBreath, targetThrust:target, tangent:tHat };
  }
  isOpen(){ return this.progress>=1; }
}
