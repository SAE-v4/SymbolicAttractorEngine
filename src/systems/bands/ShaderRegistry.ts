import type { LensKey } from "./BandTypes";
import { ObservatoryProfile, WitnessProfile } from "./Presets";

import OBS_FS from "@systems/bands/shaders/frag.glsl?raw";
import WIT_FS from "@systems/bands/shaders/frag_witness.glsl?raw";
// (Metabolic/Garden still reuse OBS_FS for now)

const MetabolicProfile = { ...ObservatoryProfile, name: "metabolic" };
const GardenProfile    = { ...ObservatoryProfile, name: "garden" };

export const ShaderRegistry: Record<LensKey, { fs: string; profile: any }> = {
  observatory: { fs: OBS_FS, profile: ObservatoryProfile },
  witness:     { fs: WIT_FS, profile: WitnessProfile },
  metabolic:   { fs: OBS_FS, profile: MetabolicProfile },
  garden:      { fs: OBS_FS, profile: GardenProfile },
};
