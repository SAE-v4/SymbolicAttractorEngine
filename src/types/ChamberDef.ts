export type ChamberDef = {
  id: string;
  title?: string;
  description?: string;

  systems: {
    motion: {
      accel: number;
      maxSpeed: number;
      softWall?: boolean;
    };
    gate: {
      dir: 1 | -1;              // CCW=1, CW=-1
      friendliness: number;     // higher = easier
      openThreshold: number;    // coherence threshold
      openSeconds: number;      // how long to sustain
    };
    breath: {
      swell: number;            // amplitude of breathing modulation
      band: {
        alphaBase: number;
        alphaGain: number;
      };
      witness: {
        auraRBase: number;
        auraRGain: number;
        auraABase: number;
        auraAGain: number;
      };
    };
    audio: {
      enabled: boolean;
      pad?: string;             // background pad sample
      chime?: string;           // chime sample on open
    };
  };

  debug?: {
    showWitnessVel?: boolean;
    showGateHalo?: boolean;
  };
};