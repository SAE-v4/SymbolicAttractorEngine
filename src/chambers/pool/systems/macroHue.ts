import type { DayPhase } from "@/types/";
export function hueForPhase(p: DayPhase){ return p==="dawn"?75 : p==="day"?95 : p==="dusk"?35 : 240; }
export function macroHue(day01:number, phase: DayPhase){ return hueForPhase(phase) + 8 * Math.sin(day01 * Math.PI * 2); }
