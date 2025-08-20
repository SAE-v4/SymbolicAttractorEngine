export type GateFlash = {
  energy: number;      // 0..1 internal energy that decays
  radiusGain: number;  // expanding radius delta (px)
  t: number;           // time since last trigger
  cfg: {
    halfLife: number;      // s to halve energy
    maxRadiusGain: number; // px at energy 1
    maxAlpha: number;      // peak opacity
    inflate: number;       // >1 pops fast then eases
  };
};

export function createGateFlash(): GateFlash {
  return {
    energy: 0,
    radiusGain: 0,
    t: 0,
    cfg: { halfLife: 0.55, maxRadiusGain: 220, maxAlpha: 0.45, inflate: 1.15 },
  };
}

export function triggerGateFlash(f: GateFlash, strength = 1.0) {
  f.energy = Math.min(1, f.energy + strength);
  f.t = 0;
}

export function updateGateFlash(f: GateFlash, dt: number) {
  if (f.energy <= 0) return;
  f.t += dt;
  const k = Math.pow(0.5, dt / Math.max(0.0001, f.cfg.halfLife));
  f.energy *= k;

  const inflateT = 1 - Math.exp(-f.t);
  const inflate = Math.pow(inflateT, f.cfg.inflate);
  f.radiusGain = f.cfg.maxRadiusGain * inflate * f.energy;

  if (f.energy < 0.002) { f.energy = 0; f.radiusGain = 0; }
}

export function gateFlashAlpha(f: GateFlash) {
  const peak = Math.min(1, 1.25 * (1 - Math.exp(-2.5 * f.t)));
  return f.cfg.maxAlpha * f.energy * peak;
}
