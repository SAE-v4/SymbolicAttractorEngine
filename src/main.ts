import { BreathRuntime, type BreathConfig } from './systems/breath/BreathRuntime';
import { SkyGLRenderer } from '@renderer/skygl/skyGLRenderer';

const canvas = document.createElement('canvas');
Object.assign(canvas.style, { position:'fixed', inset:'0', width:'100vw', height:'100vh', display:'block' });
document.body.appendChild(canvas);

const sky = new SkyGLRenderer(canvas);

// Make bands obvious
sky.setParams({
  bandAlphaBase: 0.18,   // was 0.05
  bandAlphaGain: 0.30,   // was 0.07
  bandFreq: 5.0,         // slightly fewer, bolder bands
  bandDriftBase: 0.40,   // was 0.10
  bandDriftGain: 0.40,   // was 0.10
});

// Make halo/ring obvious
sky.setParams({
  haloIntensityB: 0.45,  // was 0.20
  haloIntensityG: 0.80,  // was 0.30
  haloGainR: 0.25,       // was 0.15
  ringMaxAlpha: 0.60,    // was 0.25
  ringGainR: 0.20,       // was 0.12
});

// Balanced preset breath
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

window.addEventListener('keydown', (e)=>{
  if (e.key === '1') sky.setParams({ bandAlphaBase: 0.05, bandAlphaGain: 0.07 });
  if (e.key === '2') sky.setParams({ bandAlphaBase: 0.18, bandAlphaGain: 0.30 });
  if (e.key === '3') sky.setParams({ haloIntensityB: 0.20, haloIntensityG: 0.30, ringMaxAlpha: 0.25 });
  if (e.key === '4') sky.setParams({ haloIntensityB: 0.45, haloIntensityG: 0.80, ringMaxAlpha: 0.60 });
});

// Simple HUD
const hud = document.createElement('div');
hud.style.cssText='position:fixed;left:12px;top:12px;color:#9ecbff;font:12px/1.2 monospace;background:#0a1422cc;padding:8px 10px;border-radius:8px';
document.body.appendChild(hud);

let last = performance.now();
function frame(t:number){
  const dt = (t - last) / 1000; last = t;

  breath.tick(dt);
  sky.setBreath({
    breath01: breath.state.breath01,
    breathSS: breath.state.breathSS,
    velocity: breath.state.velocity,
  });


  sky.render(t/1000);

  hud.textContent =
    `phase: ${breath.state.phase}  ` +
    `breath01: ${breath.state.breath01.toFixed(3)}  ` +
    `velocity: ${breath.state.velocity.toFixed(3)}  ` +
    `tCycle: ${breath.state.tCycle.toFixed(3)}`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
