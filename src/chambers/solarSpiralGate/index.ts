import type { Chamber } from '@types/Chamber';
import { mountSolarSpiralGate } from './mount'; // factor legacyInit into here

export const solarSpiralGate: Chamber = {
  manifest: {
    id: 'solar-spiral-gate',
    name: 'Solar Spiral Gate',
    version: '0.2.0',
    description: 'Breathing sky, spiral ribbon, traveler & gate flash',
    tags: ['breath','spiral','gate']
  },
  mount(opts) { return mountSolarSpiralGate(opts); }
};

