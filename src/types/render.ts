// src/types/render.ts

import type { TimeState, WorldState } from "@/types/core";

export interface CanvasSize {
  cssW: number;
  cssH: number;
  dpr: number;
  pxW: number;
  pxH: number;
}

export interface RenderContext2D {
  ctx: CanvasRenderingContext2D;
  size: CanvasSize;
  time: TimeState;
}

export interface RenderConfig {
  wheel: {
    radiusFrac: number;
    thicknessFrac: number;
    gapRad: number;
  };
  debug: {
    showSafeArea: boolean;
    showCentroid: boolean;
  };
}

export interface Layer2D {
  id: string;
  draw(rc: RenderContext2D, world: WorldState, cfg: RenderConfig): void;
}
