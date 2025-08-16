import { EngineLoop } from "./engine/EngineLoop";
//import { LookingGlassChamber } from "./chambers/LookingGlassChamber";
//import { RabbitHoleChamber } from "./chambers/RabbitHoleChamber";
import { SpiralGateChamber } from "./chambers/flow/SpiralGateChamber";
import { WitnessControls } from "./controls/WitnessControls";
//import { crossed } from "./utils/phaseUtils";
//import { buildChamber } from "./chambers/core/factory";
//import { lookingGlassDef } from "./chambers/defs/LookingGlass.def";
import { TempoEngine } from "./tempo/TempoEngine";
import { Services } from "./chambers/core/Services";
import { Flags } from "./utils/Flags";
const flags = new Flags();

const canvas = document.getElementById("engine-canvas") as HTMLCanvasElement;
const tempo = new TempoEngine();

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
const chamber = new SpiralGateChamber(canvas, services, flags); // if your base takes services
// Controls
console.log(chamber)
// Controls
const controls = new WitnessControls(
  canvas,
  (dx, dy) => chamber.setWitnessFacing?.(dx, dy),
  (amt)    => chamber.thrustWitness?.(amt),
  ()       => chamber.getWitnessPos()        // <— no optional chaining here
);



const thresholds = [0, 0.25, 0.5, 0.75];

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
