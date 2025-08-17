import { loadChamberDefPublic } from "@utils/chamberLoader";
import type { Services } from "@types/Services";
import { SpiralGateChamber } from "@chambers/SpiralGateChamber";
import { Tempo } from "@systems/tempo";

let chamber: SpiralGateChamber | null = null;
let activeThrust = 0;

async function init() {
  const def = await loadChamberDefPublic("/chambers/spiral-gate.yaml");

  const canvas = document.getElementById("engine-canvas") as HTMLCanvasElement;
  canvas.style.touchAction = "none";

  // Create tempo instance
  const tempo = new Tempo();

  // Wrap it in Services
  const services: Services = {
    tempo: {
      phase: () => tempo.phase(),
      getBpm: () => tempo.getBpm(),
      setBpm: (v: number) => tempo.setBpm(v),
      onBeat: (k: string, fn: () => void) => tempo.onBeat(k, fn),
    },
  };

  // helpers
  function canvasPoint(canvasEl: HTMLCanvasElement, e: PointerEvent) {
    const rect = canvasEl.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    return { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
  }
  function norm(dx: number, dy: number) {
    const m = Math.hypot(dx, dy) || 1;
    return { x: dx / m, y: dy / m };
  }

  // Chamber
  chamber = new SpiralGateChamber(canvas, services, def);

  // Input
  let isDown = false;
  canvas.addEventListener("pointerdown", (e) => {
    if (!chamber) return;
    isDown = true;

    const p = canvasPoint(canvas, e);
    const pos = chamber.getWitnessPos();
    const dir = norm(p.x - pos.x, p.y - pos.y);

    chamber.setWitnessFacing(dir.x, dir.y);
    activeThrust = 1;

    // OPTIONAL: if you later expose audio ctx, sync tempo to audio time
    // const ctx = (chamber as any)?.getAudioContext?.();
    // if (ctx) tempo.useAudioClock?.(ctx);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!chamber || !isDown) return;
    const p = canvasPoint(canvas, e);
    const pos = chamber.getWitnessPos();
    const dir = norm(p.x - pos.x, p.y - pos.y);
    chamber.setWitnessFacing(dir.x, dir.y);

    if (typeof e.pressure === "number" && e.pressure > 0) {
      activeThrust = Math.max(0, Math.min(1, e.pressure));
    }
  });

  const endPress = () => { isDown = false; activeThrust = 0; };
  canvas.addEventListener("pointerup", endPress);
  canvas.addEventListener("pointercancel", endPress);

  // ✅ pass tempo in here
  startLoop(tempo);
}

function startLoop(tempo: Tempo) {
  if (!chamber) return;
  let last = performance.now();

  function tick(now: number) {
    const dt = (now - last) / 1000;
    last = now;

    // advance tempo ✅
    tempo.tick(dt);

    // keep thrust “live”
    chamber!.thrustWitness(activeThrust);

    chamber!.update(dt);
    chamber!.render(1);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

init();
