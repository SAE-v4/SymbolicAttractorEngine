// chambers/flow/SpiralGateChamber.ts
import { Services } from "../core/Services";
import { FlowGate } from "./FlowGate"; // adjust relative path if needed
import { Flags } from "../../utils/Flags";

type Vec2 = { x: number; y: number };
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function len(v: Vec2) {
  return Math.hypot(v.x, v.y);
}
function norm(v: Vec2): Vec2 {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}

export class SpiralGateChamber {
  constructor(private canvas: HTMLCanvasElement, private services: Services, private flags: Flags) { /* wire systems */ }
  public setWitnessFacing(dx:number, dy:number) { /* pass to motion */ }
  public thrustWitness(amt:number) { /* pass to motion */ }
  public getWitnessPos() { /* from motion */ }
  public update(dt:number) { /* motion.update → gate.update → bloom */ }
  public render(alpha:number) { /* PhaseFX → GateRenderer → Witness */ }
  public onBeat?() { /* optional visuals */ }
}

