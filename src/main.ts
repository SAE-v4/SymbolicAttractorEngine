import {
  BreathRuntime,
  type BreathConfig,
} from "@systems/breath/BreathRuntime";
import { SkyGLRenderer } from "@renderers/skygl/skyGLRenderer";
import { SolarSpiralGateChamber } from "@chambers/solarSpiralGate/SolarSpiralGateChamber";
import { SceneCanvas } from "@chambers/solarSpiralGate/spiral/SceneCanvas";
import { startApp } from "./app/AppShell";
import '@/app/engine-root';


import {
  SOLAR_SPIRAL_CFG,
  SOLAR_RING_CLOCK,
  SOLAR_TRAVELER_CFG,
  SOLAR_WITNESS_CFG,
  SOLAR_VISUALS,
} from "@chambers/presets/solarPresets";


