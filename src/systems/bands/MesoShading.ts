// src/systems/bands/MesoShading.ts
import type { DayPhase } from "./BandTypes";

export type MesoMul = { alphaMul:number; lightnessLift:number }; // lightnessLift in [-0.10..+0.10] approx

export function dayShading(day01:number, phase:DayPhase): MesoMul {
  // simple curve: brighter at dawn, steady day, dim dusk, lowest night
  const dawn = phase==="dawn" ? 1 : 0;
  const dusk = phase==="dusk" ? 1 : 0;
  const night= phase==="night"? 1 : 0;

  const alphaMul = night ? 0.70 : dusk ? 0.85 : dawn ? 1.05 : 1.00;
  const lightnessLift = night ? -0.10 : dusk ? -0.09 : dawn ? +0.10 : 0.0;
  return { alphaMul, lightnessLift };
}
