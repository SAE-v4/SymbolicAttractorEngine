// mechanics/spiralAlignment.ts
export function spiralTangentAt(
  cx:number, cy:number, r0:number, turns:number, t:number
){
  const TWO_PI = Math.PI*2;
  const θ = t * turns * TWO_PI;
  const b = (r0*0.65)/ (turns * TWO_PI);
  const r = r0 + b*θ;
  const x = cx + r*Math.cos(θ);
  const y = cy + r*Math.sin(θ);

  // finite differencing for tangent
  const eps = 0.0005;
  const θ2 = (t+eps) * turns * TWO_PI;
  const r2 = r0 + b*θ2;
  const x2 = cx + r2*Math.cos(θ2);
  const y2 = cy + r2*Math.sin(θ2);

  const tx = x2 - x, ty = y2 - y;
  const mag = Math.hypot(tx,ty)||1;
  return { x, y, tx:tx/mag, ty:ty/mag };
}

export function alignmentScore(beeFacing:{x:number;y:number}, tangent:{tx:number;ty:number}){
  // returns 0..1 (1 = perfectly aligned)
  const dot = beeFacing.x*tangent.tx + beeFacing.y*tangent.ty;
  return Math.max(0, dot); // negative is facing backward
}
