// chambers/SpiralGateChamber.ts
import type { ChamberDef } from "@types/ChamberDef";
import { MotionSystem } from "@systems/motion";
import { FlowGate } from "@systems/gate";
import { AudioSystem } from "@systems/audio/AudioSystem";
import { applyBreathFromDef } from "@config/breathRuntime";
import { drawPhaseFX } from "@render/phaseFX";
import { drawGate } from "@render/gateRenderer";
import { drawWitness } from "@render/WitnessRenderer";
import type { Services } from "@types/Services";

export class SpiralGateChamber {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  private motion: MotionSystem;
  private gate: FlowGate;
  private audio: AudioSystem;
  private openBloom = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private services: Services,
    private def: ChamberDef
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;

    console.log(def);

    // apply chamber-defined breath tuning
    applyBreathFromDef(def);

    this.handleResize();
    addEventListener("resize", () => this.handleResize());

    // systems from def
    this.motion = new MotionSystem({
      accel: def.systems.motion.accel,
      maxSpeed: def.systems.motion.maxSpeed,
    });

    this.gate = new FlowGate(
      { x: this.width * 0.5, y: this.height * 0.5 },
      () => this.services.tempo.phase(),
      def.systems.gate.dir,
      def.systems.gate.friendliness,
      {
        openThreshold: def.systems.gate.openThreshold,
        openSeconds: def.systems.gate.openSeconds,
      }
    );

   this.audio = new AudioSystem({
  enabled: this.def.systems.audio.enabled,
  audioClick: this.def.systems.audio.audioClick ?? true,
  pad: this.def.systems.audio.pad,
  chime: this.def.systems.audio.chime,
  masterGain: this.def.systems.audio.masterGain ?? 0.8,
});

this.canvas.addEventListener("pointerdown", () => this.audio.unlock(), { once: true });
    this.canvas.addEventListener("pointerdown", () => this.audio.unlock(), { once: true });
  }

  private handleResize() {
    const dpr = devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = this.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = this.height = Math.max(1, Math.floor(rect.height * dpr));
    if (this.motion) this.motion.resize(this.width, this.height);
  }

  // control API (unchanged)
  setWitnessFacing(dx: number, dy: number) { this.motion.setFacing(dx, dy); }
  thrustWitness(amt: number) { this.motion.setThrust(amt); }
  getWitnessPos() { return this.motion.pos; }

  update(dt: number) {
    this.motion.update(dt, !!this.def.systems.motion.softWall);

    this.gate.update(
      dt,
      this.motion.pos,
      this.motion.vel,
      this.motion.facing,
      this.motion.thrust
    );

    const r = this.gate.readout;
    const coherence = r.sAlign * r.sBreath * r.sCoherent;

    this.audio.update(dt, {
      phase: this.services.tempo.phase(),
      pos: this.motion.pos,
      vel: this.motion.vel,
      facing: this.motion.facing,
      thrust: this.motion.thrust,
      gate: { ...r, coherence, justOpened: this.gate.consumeJustOpened() },
      width: this.width, height: this.height,
    });
  }

  render(_alpha: number) {
    const g = this.ctx;
    g.setTransform(1,0,0,1,0,0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0,0,this.width,this.height);

    const phase = this.services.tempo.phase();

    drawPhaseFX(g, phase, this.width, this.height);
    drawGate(g, phase, this.width, this.height, this.gate.readout, this.openBloom);
    drawWitness(g, phase, this.motion.pos, this.motion.vel, this.motion.facing, this.motion.thrust);
  }
}
