import type { BreathState } from "@/systems/_legacy/breath/BreathRuntime";

export interface ChamberCtx {
  g: CanvasRenderingContext2D;  // scene ctx
  cx: number; cy: number;       // gate center
  rGate: number;                // base gate radius
  tCycle: number;               // 0..1 (wrapped)
  breath: BreathState;          // full breath state
  // room for: dims, DPR, palettes, etc.
}

export interface ChamberSystem {
  id: string;
  z: number;                                // draw order (low → high)
  tick(dt: number, ctx: ChamberCtx): void;  // update internal state
  render(ctx: ChamberCtx): void;            // draw into scene ctx
}
