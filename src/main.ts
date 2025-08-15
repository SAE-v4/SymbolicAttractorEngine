import { EngineLoop } from "./engine/EngineLoop";
import { AudioEngine } from "./audio/AudioEngine";
//import { LookingGlassChamber } from "./chambers/LookingGlassChamber";
//import { RabbitHoleChamber } from "./chambers/RabbitHoleChamber";
import { SpiralGateChamber } from "./chambers/flow/SpiralGateChamber";
import { WitnessControls } from "./controls/WitnessControls";
import { crossed } from "./utils/phaseUtils";
import { buildChamber } from "./chambers/core/factory";
import { lookingGlassDef } from "./chambers/defs/LookingGlass.def";
import { TempoEngine } from "./tempo/TempoEngine";
import { Services } from "./chambers/core/Services";

const canvas = document.getElementById("engine-canvas") as HTMLCanvasElement;
const tempo = new TempoEngine();
const audio = new AudioEngine();

// Services object to hand to chambers
const services: Services = {
  tempo: {
    phase: () => tempo.phase(),
    getBpm: () => tempo.getBpm(),
    setBpm: (v:number) => tempo.setBpm(v),
    onBeat: (k, fn) => tempo.onBeat(k, fn),
  },
};

// Drive beats from TempoEngine (already wired)
services.tempo?.onBeat("quarter", () => chamber.onBeat?.()); // visual pulse + collect
services.tempo?.onBeat("downbeat", () => {/* audio cue later */});
services.tempo?.onBeat("eighth",  () => {/* light tics later */});
const chamber = new SpiralGateChamber(canvas, services); // if your base takes services
// Controls
console.log(chamber)
const controls = new WitnessControls(
  canvas,
  (dx,dy) => chamber.setWitnessFacing?.(dx,dy),
  (amt)   => chamber.thrustWitness?.(amt),
  ()      => chamber.getWitnessPos?.()
);


// simple UI wires
const startBtn = document.getElementById("start-audio") as HTMLButtonElement;
const pauseBtn = document.getElementById("pause") as HTMLButtonElement;
const resumeBtn = document.getElementById("resume") as HTMLButtonElement;
const bpmInput = document.getElementById("bpm") as HTMLInputElement;
const bpmValue = document.getElementById("bpmValue") as HTMLSpanElement;

// BPM mapping
bpmInput.addEventListener("input", () => {
  const v = parseInt(bpmInput.value, 10);
  bpmValue.textContent = String(v);
  audio.setBpm(v);
  chamber.setPhaseSpeed?.(v / 240); // 1 bar per cycle @ 4/4
});

// Audio start / on-beat visual
startBtn.addEventListener("click", async () => {
  await audio.start();
  audio.startScheduler(() => chamber.onBeat?.());
});

pauseBtn.addEventListener("click", () => audio.pause());
resumeBtn.addEventListener("click", () => audio.resume());

// on scheduler: add a visual beat ping
startBtn.addEventListener("click", async () => {
  await audio.start();
  audio.startScheduler(() => chamber.onBeat());
});

// boot
bpmInput.dispatchEvent(new Event("input"));

let prevPhase = chamber.phase;
const thresholds = [0, 0.25, 0.5, 0.75];

// BPM UI: drive tempo; optionally link visuals to tempo

let linkTempoToPhase = true;

function syncBpmFromUI(){
  const v = parseInt(bpmInput.value, 10);
  bpmValue.textContent = String(v);
  services.tempo?.setBpm(v);
  if (linkTempoToPhase && chamber.setPhaseSpeed) {
    // 1 bar per cycle when visuals are linked
    chamber.setPhaseSpeed(v / 240); // BPM/240 -> cycles/sec
  }
}
bpmInput.addEventListener("input", syncBpmFromUI);
syncBpmFromUI();

// Beat hooks: visual pulse and (optionally) audio click
// TempoEngine beat hook (if you’re using it)
services.tempo?.onBeat("quarter", () => {
  chamber.onBeat?.();
});

// Loop
const loop = new EngineLoop({
  onUpdate: (dt) => {
    tempo.tick(dt);      // advance musical time
    chamber.update(dt);  // advance sim
  },
  onRender: (alpha) => chamber.render(alpha),
});
loop.start();

console.log("SAE v4 demo running.");
