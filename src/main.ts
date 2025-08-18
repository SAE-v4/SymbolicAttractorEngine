import { BreathRuntime, type BreathConfig } from '@systems/breath/BreathRuntime'
import { ModMatrix } from '@modulation/ModMatrix';
// Balanced preset
const cfg: BreathConfig = {
  mode: 'freeRun',
  rateBPM: 9,
  shape: {
    inhaleRatio: 0.45, holdIn: 0.05, exhaleRatio: 0.45, holdOut: 0.05,
    curveInhale: 'easeInOutSine', curveExhale: 'easeInOutSine',
  },
  variability: { enabled: true, jitterPct: 0.04, seed: 137 },
};

const breath = new BreathRuntime(cfg);
const mods = new ModMatrix();

// TEMP: wire to CSS vars so you can *see* it immediately
mods.add({ source:'breath01', scale:1, apply(v){ document.documentElement.style.setProperty('--breath01', v.toFixed(4)); }});
mods.add({ source:'velocity', scale:0.2, smooth:0.6, apply(v){ document.documentElement.style.setProperty('--breathVel', v.toFixed(4)); }});

// quick HUD
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;left:12px;top:12px;color:#9ecbff;font:12px/1.2 monospace;background:#0a1422cc;padding:8px 10px;border-radius:8px';
document.body.appendChild(hud);

let last = performance.now();
function frame(t:number){
  const dt = (t - last) / 1000; last = t;
  breath.tick(dt);
  mods.apply({
    breath01: breath.state.breath01,
    breathSS: breath.state.breathSS,
    velocity: breath.state.velocity,
    tCycle:   breath.state.tCycle,
  });
  hud.textContent =
    `phase: ${breath.state.phase}\n`+
    `breath01: ${breath.state.breath01.toFixed(3)}\n`+
    `velocity: ${breath.state.velocity.toFixed(3)}\n`+
    `tCycle:   ${breath.state.tCycle.toFixed(3)}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
