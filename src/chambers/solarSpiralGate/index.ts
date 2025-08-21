import { SolarSpiralGateChamber } from './SolarSpiralGateChamber';
import type { Chamber } from '@/types/Chamber';
export const solarSpiralGate: Chamber = {
  manifest: { id:'solar-spiral-gate', name:'Solar Spiral Gate', version:'0.2.0', description:'Breathing sky, spiral ribbon, traveler & gate flash', tags:['breath','spiral','gate'] },
  mount({ root, size, debug }) {
    // Your current main.ts logic, but scoped to `root` and using provided size.
    // Return { unmount() { /* remove canvases, listeners */ } }
    return { unmount(){} };
  }
};
