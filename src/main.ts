import { loadChamberDefPublic } from "@utils/chamberLoader";
import type { Services } from "@types/Services";
import { SpiralGateChamber } from "@chambers/SpiralGateChamber";
import { Tempo } from "@systems/tempo";   // 👈 bring back tempo system

let chamber: SpiralGateChamber | null = null;

async function init() {
  const def = await loadChamberDefPublic("/chambers/spiral-gate.yaml");

  const canvas = document.getElementById("engine-canvas") as HTMLCanvasElement;

  // Create tempo instance
  const tempo = new Tempo();

  // Wrap it in your Services object
  const services: Services = {
    tempo: {
      phase: () => tempo.phase(),
      getBpm: () => tempo.getBpm(),
      setBpm: (v: number) => tempo.setBpm(v),
      onBeat: (k: string, fn: () => void) => tempo.onBeat(k, fn),
    },
  };

  chamber = new SpiralGateChamber(canvas, services, def);

  // Example controls
  window.addEventListener("pointermove", (e) => {
    if (!chamber) return;
    // map pointer to facing
  });

  startLoop();
}

function startLoop() {
  if (!chamber) return;
  let last = performance.now();
  function tick(now: number) {
    const dt = (now - last) / 1000;
    last = now;
    chamber!.update(dt);
    chamber!.render(1);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

init();
