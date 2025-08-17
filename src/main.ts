import { EngineLoop } from "./engine/EngineLoop";
import { SpiralGateChamber } from "@chambers/SpiralGateChamber";
import { WitnessControls } from "./controls/WitnessControls";
import { Flags } from "./utils/Flags";
import { TempoEngine } from "./tempo/TempoEngine";
import { applyBreathTuningFromQueryOnce } from "@config/applyBreathTuning"; 
import { loadChamberDef } from "@utils/chamberLoader";

applyBreathTuningFromQueryOnce();
  const canvas = document.getElementById("engine-canvas") as HTMLCanvasElement;
  const tempo = new TempoEngine();

 const services = {
  tempo: {
    phase: () => tempo.phase(),
    getBpm: () => tempo.getBpm(),
    setBpm: (v:number) => tempo.setBpm(v),
    onBeat: (k: string, fn: () => void) => tempo.onBeat(k, fn),
  },
};
async function init() {
  const def = await loadChamberDef("spiral.yaml");
  const chamber = new SpiralGateChamber(canvas, services, def, {});


 
  new WitnessControls(
  canvas,
  (dx,dy) => chamber.setWitnessFacing(dx,dy),
  (amt)   => chamber.thrustWitness(amt),
  ()      => chamber.getWitnessPos()
);

services.tempo.onBeat("quarter", () => chamber.onBeat?.());

const loop = new EngineLoop({
  onUpdate: (dt) => { tempo.tick(dt); chamber.update(dt); },
  onRender: (a) => chamber.render(a),
});
loop.start();
}

init();