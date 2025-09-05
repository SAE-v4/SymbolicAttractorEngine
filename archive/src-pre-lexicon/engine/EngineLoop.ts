// src/engine/EngineLoop.ts (snippet)
import { EngineClock } from "./EngineClock";
const clock = new EngineClock();
function frame() {
  const dt = clock.tick();
  breath.tick(dt, { engineBPM: clock.bpm, motionCadenceBPM: motion.getCadenceBPM() });
  modMatrix.apply(breath.state);        // push breath → subscribers
  motion.tick(dt);
  sky.render({ breath01: breath.state.breath01, t: performance.now()/1000 });
  requestAnimationFrame(frame);
}
