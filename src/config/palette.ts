import type { OKLCH } from "@utils/oklch";

export const PALETTE = {
  dawnSteel: {
    bg:   { l:0.48, c:0.035, h:230 } satisfies OKLCH,
    ribbon:{ l:0.92, c:0.030, h:235 } as OKLCH,
    aura:  { l:0.88, c:0.030, h:235 } as OKLCH,
  },
  septemberBlue: {
    bg:   { l:0.60, c:0.060, h:242 } as OKLCH,
    ribbon:{ l:0.96, c:0.045, h:245 } as OKLCH,
    aura:  { l:0.93, c:0.050, h:245 } as OKLCH,
  }
} as const;
