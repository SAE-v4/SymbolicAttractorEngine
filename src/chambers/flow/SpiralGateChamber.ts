import { MotionSystem } from "@systems/motion";
import { FlowGate } from "@systems/gate";
import { drawPhaseFX } from "@render/phaseFX";
import { drawGate } from "@render/gateRenderer";
import { drawWitness } from "@render/WitnessRenderer";

export class SpiralGateChamber {
  private ctx: CanvasRenderingContext2D;
  private width=0; private height=0;
  private motion: MotionSystem;
  private gate: FlowGate;
  private openBloom = 0;

  constructor(private canvas: HTMLCanvasElement, private services: Services, private flags: Flags) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;
    this.motion = new MotionSystem({ accel: flags.all.accel, maxSpeed: flags.all.maxSpeed });
    this.handleResize();
    this.gate = new FlowGate({ x: this.width*0.5, y: this.height*0.5 }, () => services.tempo.phase(), flags.all.gateDir);
    addEventListener("resize", () => this.handleResize());
  }

  private handleResize() {
    const dpr = devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = this.width  = Math.max(1, Math.floor(rect.width  * dpr));
    this.canvas.height = this.height = Math.max(1, Math.floor(rect.height * dpr));
    this.motion.resize(this.width, this.height);
  }

  setWitnessFacing(dx:number, dy:number){ this.motion.setFacing(dx,dy); }
  thrustWitness(amt:number){ this.motion.setThrust(amt); }
  getWitnessPos(){ return this.motion.pos; }

  update(dt:number){
    this.motion.update(dt, this.flags.all.softWall);
    this.gate.update(dt, this.motion.pos, this.motion.vel, this.motion.facing, this.motion.thrust);
  }

  render(_alpha:number){
    const g = this.ctx;
    g.setTransform(1,0,0,1,0,0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";

    drawPhaseFX(g, this.services.tempo.phase(), this.width, this.height);
    drawGate(g, this.width, this.height, this.gate.readout, this.openBloom);
    drawWitness(g, this.motion.pos, this.motion.vel, this.motion.facing, this.motion.thrust);
  }
}
