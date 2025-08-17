// types/AudioConfig.ts
export type AudioConfig = {
  enabled: boolean;

  // toggles
  audioClick?: boolean;
  audioPad?: boolean;
  audioWitness?: boolean;

  // ids/presets (optional)
  pad?: string;
  chime?: string;

  // volumes (0..1)
  masterGain?: number;
  padVol?: number;
  clickVol?: number;
  witnessVol?: number;
};
