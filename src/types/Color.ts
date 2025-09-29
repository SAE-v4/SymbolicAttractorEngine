// src/types/Color.ts
// Portable color primitives. Palette implementation can live in systems/color.

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.4 typical
  h: number; // degrees 0..360
}

export type CssColor = string; // resolved CSS color string
