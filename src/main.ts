import { BreathRuntime, type BreathConfig } from './systems/breath/BreathRuntime';
import { SkyGLRenderer } from 'renderers/skygl/skyGLRenderer';
import { SolarSpiralGateChamber } from './chambers/solarSpiralGate/SolarSpiralGateChamber';

const baseCanvas = document.getElementById('engine-canvas') as HTMLCanvasElement;

// 🔧 DPR-safe sizing for any canvas
function sizeCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = c.getBoundingClientRect();
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
}

// --- GL sky on the base canvas ---
sizeCanvas(baseCanvas);
const sky = new SkyGLRenderer(baseCanvas);

// --- Overlay canvas (2D-ctx) created via script ---
const overlay = document.createElement('canvas');
overlay.id = 'overlay-canvas';
Object.assign(overlay.style, {
  position: 'absolute',
  inset: '0',
  width: '100%',
  height: '100%',
  display: 'block',
  zIndex: '10',              // above GL, below HUD
  pointerEvents: 'none',
});
document.getElementById('engine-root')!.appendChild(overlay);
sizeCanvas(overlay);

// --- Chamber overlay renderer (spiral/knots/traveler) ---
const chamber = new SolarSpiralGateChamber(overlay);

// --- Breath runtime (Solar Balanced to start) ---
const breathCfg: BreathConfig = {
  mode: 'freeRun',
  rateBPM: 9,
  shape: {
    inhaleRatio: 0.45, holdIn: 0.05, exhaleRatio: 0.45, holdOut: 0.05,
    curveInhale: 'easeInOutSine', curveExhale: 'easeInOutSine',
  },
  variability: { enabled: true, jitterPct: 0.03, seed: 137 },
};
const breath = new BreathRuntime(breathCfg);

// --- Resize handling for both canvases ---
function handleResize() {
  sizeCanvas(baseCanvas);
  sizeCanvas(overlay);
}
window.addEventListener('resize', handleResize);

// --- Simple HUD (optional) ---
const hud = document.createElement('div');
hud.className = 'hud';
hud.style.cssText = 'color:#9ecbff;font:12px/1.2 monospace;background:#0a1422cc;padding:8px 10px;border-radius:8px';
document.body.appendChild(hud);

// --- RAF loop ---
let last = performance.now();
function frame(t: number) {
  const dt = (t - last) / 1000; last = t;

  breath.tick(dt);

  sky.setBreath({
    breath01: breath.state.breath01,
    breathSS: breath.state.breathSS,
    velocity: breath.state.velocity,
  });
  sky.render(t / 1000);

  chamber.update(dt, breath.state);

  hud.textContent =
    `phase: ${breath.state.phase}  ` +
    `breath01: ${breath.state.breath01.toFixed(3)}  ` +
    `velocity: ${breath.state.velocity.toFixed(3)}  ` +
    `tCycle: ${breath.state.tCycle.toFixed(3)}`;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
