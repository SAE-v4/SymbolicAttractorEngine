export type OKLCH = { l: number; c: number; h: number; a?: number }; // l 0..1, c 0..~0.4, h 0..360
export const hasOKLCH = typeof CSS !== "undefined" && CSS.supports?.("color", "oklch(50% 0.05 240)");

export const oklchStr = (o: OKLCH) =>
  `oklch(${(o.l*100).toFixed(1)}% ${o.c.toFixed(3)} ${o.h.toFixed(1)}${o.a!=null?` / ${o.a}`:""})`;

export const lerp = (a:number,b:number,t:number)=>a+(b-a)*t;
export const lerpHue = (h1:number,h2:number,t:number)=>{
  let d = ((h2 - h1 + 540) % 360) - 180; return h1 + d * t;
};
export const mixOKLCH = (a:OKLCH,b:OKLCH,t:number):OKLCH => ({
  l: lerp(a.l,b.l,t), c: lerp(a.c,b.c,t), h: lerpHue(a.h,b.h,t), a: a.a!=null||b.a!=null ? lerp(a.a??1,b.a??1,t) : undefined
});
