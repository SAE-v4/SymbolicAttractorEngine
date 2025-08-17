// types/Services.ts
export type Services = {
  tempo: {
    phase: () => number;
    getBpm: () => number;
    setBpm: (v: number) => void;
    onBeat: (key: string, fn: () => void) => void;
  };
};