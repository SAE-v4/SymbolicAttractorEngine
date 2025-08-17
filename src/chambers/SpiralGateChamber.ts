// chambers/SpiralGateChamber.ts
import type { ChamberDef } from "@types/ChamberDef";
import type { Services } from "@types/Services";
import { MotionSystem } from "@systems/motion";
import { FlowGate } from "@systems/gate";
import { AudioSystem } from "@systems/audio/AudioSystem";
import { applyBreathFromDef } from "@config/breathRuntime";
import { drawPhaseFX } from "@render/phaseFX";
import { drawGate } from "@render/gateRenderer";
import { drawWitness } from "@render/WitnessRenderer";

export class SpiralGateChamber {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  private motion!: MotionSystem;
  private gate!: FlowGate;
  private audio!: AudioSystem;
  private openBloom = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private services: Services,
    private def: ChamberDef
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    this.ctx = ctx;

    // 0) apply chamber-defined breath tuning
    applyBreathFromDef(def);

    // 1) establish canvas size BEFORE creating systems
    this.handleResize();

    // 2) Motion system, then give it real dimensions + start pos
const m = this.def.systems.motion;

// Convert normalized configs to pixels if they look “small”
const accelPx     = (m.accel     <= 5 ? m.accel     * 900 : m.accel);
const maxSpeedPx  = (m.maxSpeed  <= 10 ? m.maxSpeed  * 600 : m.maxSpeed);
const damping     = m.damping ?? 0.92;

this.motion = new MotionSystem({ accel: accelPx, maxSpeed: maxSpeedPx, damping });
this.motion.resize(this.width, this.height);

    // start position (center by default)
    const cx = this.width * 0.5;
const cy = this.height * 0.5;
const baseR = Math.min(this.width, this.height) * 0.18; // same as gateRenderer
// place witness just inside the ring at the bottom
this.motion.pos = { x: cx, y: cy + baseR * 0.75 };

    // 3) Gate after we know width/height
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

    // 4) Audio from def
    this.audio = new AudioSystem({
      enabled: this.def.systems.audio.enabled,
      audioClick: this.def.systems.audio.audioClick ?? true,
      pad: this.def.systems.audio.pad,
      chime: this.def.systems.audio.chime,
      masterGain: this.def.systems.audio.masterGain ?? 0.8,
      padVol: this.def.systems.audio.padVol ?? 0.35,
      clickVol: this.def.systems.audio.clickVol ?? 0.12,
      witnessVol: this.def.systems.audio.witnessVol ?? 0.45,
      audioPad: true,
      audioWitness: true,
    });

    // iOS unlock gesture
    this.canvas.addEventListener("pointerdown", () => this.audio.unlock(), { once: true });

    // keep motion in sync with future resizes
    addEventListener("resize", () => {
      this.handleResize();
      this.motion.resize(this.width, this.height);
    });
  }

  private handleResize() {
    const dpr = devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = this.width  = Math.max(1, Math.floor(rect.width  * dpr));
    this.canvas.height = this.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  // control API
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
      width: this.width,
      height: this.height,
    });
  }

  render(_alpha: number) {
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, this.width, this.height);

    const phase = this.services.tempo.phase();
if ((Math.random()*60|0)===0) console.log("phase", phase.toFixed(2));

    drawPhaseFX(g, phase, this.width, this.height);
    drawGate(g, phase, this.width, this.height, this.gate.readout, this.openBloom);
    drawWitness(g, phase, this.motion.pos, this.motion.vel, this.motion.facing, this.motion.thrust);

  //  console.log(this.motion)
  }
}
