 // src/chambers/core/Services.ts
export type Services = {
  time?: { phase(): number; setPhaseSpeed(v:number): void };
  audio?: { onBeat(cb:(t:number)=>void): void };
  input?: unknown; // future InputBus
};
