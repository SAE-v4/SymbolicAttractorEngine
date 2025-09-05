// types/ChamberDef.ts (excerpt)
export type SpiralGateParams = {
  // spiral geometry
  turns: number;           // e.g. 1.25
  length: number;          // normalized 0..1 path coverage
  baseWidth: number;       // px
  peristalsis: { freq: number; amp: number; phase: number }; // 0..1 phase
  glow: { core: number; halo: number }; // stroke multiples
};

export type WitnessParams = {
  aura: { rBase: number; rGain: number; aBase: number; aGain: number };
  flash: { gain: number; decay: number }; // triggered on beat
};

export type PaletteKey = "solarCore"|"ring"|"spiral"|"horizon"|"spark"|"bg";

export interface ChamberDef {
  id: string;
  systems?: {
    breath?: {
      shape: number;      // 0..1 curve bias for breathing
      offset: number;     // phase offset
      beatWidth: number;  // 0..1 width of on-beat window
      band: { alphaBase:number; alphaGain:number; alphaBeat:number };
      gate?: { ringGain?: number };
    };
    palette?: Partial<Record<PaletteKey,string>>;
    //audio: { enabled: boolean; pad?: string; chime?: string };
  };
  spiral?: SpiralGateParams;
  witness?: WitnessParams;
  debug?: { showWitnessVel?: boolean; showGateHalo?: boolean };
}