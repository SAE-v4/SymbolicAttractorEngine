// config/palette.ts
type RGBA = { r:number; g:number; b:number; a:number };
const hex = (h:string) => {
  const m = /^#?([a-f0-9]{6})$/i.exec(h)!;
  const n = parseInt(m[1], 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
};
export const PAL = (def: ChamberDef) => {
  const p = {
    bg: "#0A1830",
    ring: "#B8D6FF",
    spiral: "#A6C6FF",
    horizon:"#8DB1FF",
    spark:"#D7E7FF",
    solarCore:"#FFEFC6",
    ...(def.systems?.palette ?? {})
  };
  return {
    raw: p,
    rgba: (k: PaletteKey, a=1): RGBA => ({...hex(p[k]), a}),
    css:  (k: PaletteKey, a=1) => {
      const c = hex(p[k]); return `rgba(${c.r},${c.g},${c.b},${a})`;
    }
  };
};
