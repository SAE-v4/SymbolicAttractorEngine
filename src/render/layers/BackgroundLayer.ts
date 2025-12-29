// src/render/layers/BackgroundLayer.ts

import type { Layer2D } from "@/types/render";

export const BackgroundLayer: Layer2D = {
  id: "bg",
  draw({ ctx, size }) {
    ctx.fillStyle = "#0b0d12";
    ctx.fillRect(0, 0, size.cssW, size.cssH);
  },
};
