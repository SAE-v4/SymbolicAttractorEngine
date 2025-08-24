// types for knots, states

export interface Knot {
  theta: number;      // angle (radians)
  r: number;          // spiral radius in normalized units (minDim space)
  pos: [number, number]; // normalized coords (x,y), origin center
}

export interface SpiralConfig {
  type: 'archimedean' | 'log';
  a: number;              // base radius (arch) or scale (log)
  k: number;              // radial growth (arch) or growth factor (log)
  turns: number;
  knots: { count: number; spacing: 'even-theta' | 'arc' };
  breathe: {
    scaleEpsilon: number; // S(t) = 1 + ε * breathSS
    widthGain: number;    // ribbon thickness gain from breath01
    peristalsis?: { amp: number; speed: number }; // optional
  };
}

export interface RingClockConfig { rBase: number; rGain: number; hitEpsilon: number; }

export interface TravelerConfig { startIndex: number; ease: 'outCubic'; moveDur: number; leanGain: number; }

export interface WitnessConfig { pos: [number, number]; scaleBase: number; scaleGain: number; glowGain: number; }

export interface VisualsConfig {
  palette: 'solar';
  bands: { driftBase:number; driftGain:number; dutyRange:[number,number]; };
  ring: { sharpenFromVelocity:number; };
  bloom: { peakPop: { amount:number; decayMs:number } };
}
