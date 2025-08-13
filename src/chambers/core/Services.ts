 // src/chambers/core/Services.ts
export type Services = {
  tempo?: {
    phase: () => number;
    getBpm: () => number;
    setBpm: (v:number) => void;
    onBeat: (kind: "downbeat"|"quarter"|"eighth", fn:(t:number)=>void) => () => void;
  };
  audio?: { /* existing later */ };
  input?: unknown;
};
