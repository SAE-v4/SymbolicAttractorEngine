// src/presets/presets.ts
import type { ChamberDef } from "@/types/ChamberDefs";
import { DEFAULT_SOLAR_SPIRAL_DEF as BASE } from "@/chambers/_legacy/solarSpiralGate/SolarSpiralGateChamber";
import type { SkyGLRenderer } from "@/chambers/_legacy/solarSpiralGate/renderers/skygl/skyGLRenderer";

export type SkyPreset = {
  colors: {
    skyTop: [number, number, number];
    skyBot: [number, number, number];
    band:   [number, number, number];
    halo:   [number, number, number];
    ring:   [number, number, number];
  };
  params: {
    bandFreq: number;
    bandAlphaBase: number;
    bandAlphaGain: number;
    bandDriftBase: number;
    bandDriftGain: number;
    haloBaseR?: number;       // kept for backward compat
    haloGainR: number;
    haloIntensityB: number;
    haloIntensityG: number;
    ringBaseR?: number;       // kept for backward compat
    ringGainR: number;
    ringMaxAlpha: number;
  };
};

export type OcclusionPreset = {
  mode: "safe" | "snug";
  rOfRing: number;   // ring stack radius factor (relative to gate r)
  span: number;      // radians
  thick: number;     // px (ignored in snug)
  bias: number;      // px
  flowBoost: number; // ribbon facing influence
};

export type Preset = {
  id: string;
  label?: string;
  def: ChamberDef;
  sky: SkyPreset;
  occ: OcclusionPreset;
};

// ---- Current “snapshot” look ----------------------------------------------
export const Presets = {
  default_2025_08_24: <Preset>{
    id: "default_2025_08_24",
    label: "Solar Spiral Gate • 2025-08-24",
    def: {
      ...BASE,
      spiral: {
        ...BASE.spiral!,
        turns: 1.15,
        baseWidth: 10,
        peristalsis: { freq: 2.0, amp: 0.6, phase: 0.0 },
      },
      systems: {
        ...BASE.systems,
        palette: {
          solarCore: "#FFEFC2",
          ring: "#B9D7FF",
          spiral: "#A9C9FF",
          horizon: "#90B6FF",
          spark: "#CFE3FF",
          bg: "#07162A",
        },
        breath: {
          ...BASE.systems!.breath!,
          band: { alphaBase: 0.22, alphaGain: 0.35, alphaBeat: 0.14 },
          gate: { ringGain: 0.6 },
        },
      },
    },
    sky: {
      colors: {
        skyTop: [0x0E/255,0x1C/255,0x2A/255],
        skyBot: [0x24/255,0x3C/255,0x5A/255],
        band:   [0x96/255,0xB4/255,0xFF/255],
        halo:   [0xA9/255,0xC5/255,0xFF/255],
        ring:   [0xC8/255,0xDA/255,0xFF/255],
      },
      params: {
        bandFreq: 6.0,
        bandAlphaBase: 0.05,
        bandAlphaGain: 0.07,
        bandDriftBase: 0.10,
        bandDriftGain: 0.10,
        haloGainR: 0.15,
        haloIntensityB: 0.20,
        haloIntensityG: 0.30,
        ringGainR: 0.12,
        ringMaxAlpha: 0.25,
      },
    },
    occ: {
      mode: "safe",
      rOfRing: 0.64,
      span: Math.PI * 0.82,
      thick: 14,
      bias: 0.25,
      flowBoost: 1.0,
    },
  },

  // Optional: a snug, more aggressive lip
  snug_demo: <Preset>{
    id: "snug_demo",
    label: "Snug Occlusion",
    def: BASE,
    sky: undefined as any,  // inherit from default below
    occ: { mode: "snug", rOfRing: 0.635, span: Math.PI*0.86, thick: 12, bias: 0.35, flowBoost: 1.15 }
  }
} as const;

type PresetKey = keyof typeof Presets;

// inherit sky from default if missing
(Presets.snug_demo as any).sky = (Presets.default_2025_08_24 as Preset).sky;

// ---- Helpers ---------------------------------------------------------------
export function installPresetGlobals(p: Preset) {
  (window as any).__occMode   = p.occ.mode;
  (window as any).__occRO     = p.occ.rOfRing;
  (window as any).__occSpan   = p.occ.span;
  (window as any).__occThick  = p.occ.thick;
  (window as any).__occBias   = p.occ.bias;
  (window as any).__flowBoost = p.occ.flowBoost;
}

export function applySkyPreset(sky: SkyGLRenderer, p: Preset) {
  sky.setColors(p.sky.colors);
  sky.setParams(p.sky.params);
}

// Developer convenience for hot swapping from console:
//   window.swapPreset('snug_demo')
export function attachHotSwap(sky: SkyGLRenderer, setChamberDef: (d: ChamberDef)=>void) {
  (window as any).swapPreset = (key: PresetKey) => {
    const p = Presets[key];
    if (!p) return console.warn("Unknown preset:", key);
    installPresetGlobals(p);
    applySkyPreset(sky, p);
    // ChamberDef changes require a re-pass into the chamber:
    setChamberDef(p.def);
    console.log("[preset] applied:", p.id);
  };
}
