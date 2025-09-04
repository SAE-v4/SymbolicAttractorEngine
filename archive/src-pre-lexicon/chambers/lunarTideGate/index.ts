import type { Chamber } from '@types/Chamber';
import { mountLunarTideGate } from './mount';

export const lunarTideGate: Chamber = {
  manifest: {
    id: 'lunar-tide-gate',
    name: 'Lunar Tide Gate',
    version: '0.1.0',
    description: 'Tidal bands and a quiet central gate; no spiral.',
    tags: ['breath','lunar','gate']
  },
  mount: mountLunarTideGate
};
