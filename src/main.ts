import { EngineLoop } from "./engine/EngineLoop";
import { AudioEngine } from "./audio/AudioEngine";
import { LookingGlassChamber } from "./chambers/LookingGlassChamber";
import { WitnessControls } from "./controls/WitnessControls";
import { crossed } from "./utils/phaseUtils";

const canvas = document.getElementById("engine-canvas") as HTMLCanvasElement;
const chamber = new LookingGlassChamber(canvas);
const audio = new AudioEngine();

const controls = new WitnessControls(
  canvas,
  (dx,dy) => chamber.setWitnessFacing(dx, dy),
  (amt)   => chamber.thrustWitness(amt),
  () => chamber.getWitnessPos(), // <— new
);

// simple UI wires
const startBtn = document.getElementById("start-audio") as HTMLButtonElement;
const pauseBtn = document.getElementById("pause") as HTMLButtonElement;
const resumeBtn = document.getElementById("resume") as HTMLButtonElement;
const bpmInput = document.getElementById("bpm") as HTMLInputElement;
const bpmValue = document.getElementById("bpmValue") as HTMLSpanElement;

bpmInput.addEventListener("input", () => {
  const v = parseInt(bpmInput.value, 10);
  bpmValue.textContent = String(v);
  audio.setBpm(v);
  // map bpm to phase speed so visuals keep a rough musical relationship
  chamber.setPhaseSpeed(v / 60 / 4); // 1 full orbit = 4 beats
});

startBtn.addEventListener("click", async () => {
  await audio.start();
  audio.startScheduler(() => chamber.onBeat());
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

const loop = new EngineLoop({
  onUpdate: (dt) => {
    const before = chamber.phase;
    chamber.update(dt);
    const t = crossed(thresholds, before, chamber.phase);
    if (t !== null) {
      chamber.onBeat();
    }
    prevPhase = chamber.phase;
  },

 onRender: (alpha) => chamber.render(alpha),
});

loop.start();

console.log("SAE v4 demo running.");
