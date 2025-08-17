// types/ChamberDef.ts
export type ChamberDef = {
  id: string;
  title?: string;
  description?: string;

  systems: {
    motion: { accel: number; maxSpeed: number; softWall?: boolean };
    gate: {
      dir: 1 | -1;
      friendliness: number;
      openThreshold: number;
      openSeconds: number;
    };
    breath: {
      shape?: number; offset?: number; beatWidth?: number;
      band: { alphaBase: number; alphaGain: number; alphaBeat?: number };
      witness: { auraRBase: number; auraRGain: number; auraABase: number; auraAGain: number };
      gate?: { swellPct?: number; strokeBase?: number; strokeProgress?: number; strokeBreath?: number; strokeBloom?: number; ringAlphaMax?: number; glowAlphaMax?: number };
    };
    audio: { enabled: boolean; pad?: string; chime?: string };
  };

  debug?: { showWitnessVel?: boolean; showGateHalo?: boolean };
};
