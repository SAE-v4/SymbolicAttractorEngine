// src/render/CanvasPipeline2D.ts

import type { Layer2D, RenderConfig, RenderContext2D } from "@/types/render";
import type { TimeState, WorldState } from "@/types/core";
import { measureCanvas } from "@/render/canvasSize";

export class CanvasPipeline2D {
  private ctx: CanvasRenderingContext2D;
  private layers: Layer2D[] = [];
  private lastNow = performance.now();

  constructor(
    private canvas: HTMLCanvasElement,
    layers: Layer2D[],
    private cfg: RenderConfig
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;
    this.layers = layers.slice();
  }

  setLayers(layers: Layer2D[]) {
    this.layers = layers.slice();
  }

  setConfig(cfg: RenderConfig) {
    this.cfg = cfg;
  }

  frame(world: WorldState, now = performance.now()) {
    const size = measureCanvas(this.canvas);

    const dt = Math.max(0, Math.min(50, now - this.lastNow));
    this.lastNow = now;

    const time: TimeState = { now, dt };

    // draw in CSS pixel coords; scale once for DPR
    this.ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    this.ctx.clearRect(0, 0, size.cssW, size.cssH);

    const rc: RenderContext2D = { ctx: this.ctx, size, time };
    for (const layer of this.layers) {
      layer.draw(rc, world, this.cfg);
    }
  }
}
