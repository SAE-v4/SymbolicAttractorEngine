// src/config/axes.ts
export const AXES = {
  railWidth: 2.0,
  vertical: { z: +1 },
  horizontal: { z: +1 },
  beacons: {
    heart:   { z: +3, offsetR: 2.75 }, // (cx, cy - r*offsetR)
    dreamer: { z: +3, offsetX: -2.25, offsetY: -0.25 },
    mirror:  { z: +3, offsetX: +2.25, offsetY: -0.25 },
  },
};
