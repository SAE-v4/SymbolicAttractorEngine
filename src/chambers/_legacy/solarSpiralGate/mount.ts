// src/chambers/solarSpiralGate/mount.ts
import type { ChamberMountOpts } from "@types/Chamber";
import { BreathRuntime, type BreathConfig } from "@/systems/_legacy/breath/BreathRuntime";
import { SkyGLRenderer } from "@/chambers/_legacy/solarSpiralGate/renderers/skygl/skyGLRenderer";
import { SceneCanvas } from "@chambers/_legacy/solarSpiralGate/spiral/SceneCanvas";
import { SolarSpiralGateChamber } from "./SolarSpiralGateChamber";
import { Presets, installPresetGlobals, applySkyPreset, attachHotSwap } from "@/chambers/_legacy/solarSpiralGate/presets/presets";

// pick preset (optionally via query ?preset=snug_demo)
const key = new URLSearchParams(location.search).get("preset") || "default_2025_08_24";
const PRESET = (Presets as any)[key] || Presets.default_2025_08_24;


// spiral constants (match DEFAULT_DEF)
const TURNS = 1.15;
const LENGTH = 1.0;
const TWO_PI = Math.PI * 2;

export function mountSolarSpiralGate(opts: ChamberMountOpts) {
  const root = opts.root;

  // --- canvases ---
  const glCanvas = document.createElement("canvas");
  Object.assign(glCanvas.style, { position:"absolute", inset:"0", width:"100%", height:"100%", display:"block", zIndex:"0" });
  root.appendChild(glCanvas);

  const sceneCanvas = document.createElement("canvas");
  Object.assign(sceneCanvas.style, { position:"absolute", inset:"0", width:"100%", height:"100%", display:"block", zIndex:"10", pointerEvents:"none" });
  root.appendChild(sceneCanvas);

  // --- DPR / 2D ctx ---
  function sizeCanvas(c: HTMLCanvasElement) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return dpr;
  }
  function attach2D(c: HTMLCanvasElement) {
    const g = c.getContext("2d", { alpha: true, colorSpace: "srgb" })!;
    const rescale = () => { const dpr = sizeCanvas(c); g.setTransform(1,0,0,1,0,0); g.scale(dpr, dpr); };
    rescale();
    return { g, rescale };
  }

  // --- GL + 2D ---
sizeCanvas(glCanvas);
const sky = new SkyGLRenderer(glCanvas);
installPresetGlobals(PRESET);
applySkyPreset(sky, PRESET);

  const { g: sceneCtx, rescale: rescaleScene } = attach2D(sceneCanvas);
  const painter = new SceneCanvas(sceneCanvas, sceneCtx); // ok if unused

  // --- Breath ---
  const breathCfg: BreathConfig = {
    mode: "freeRun", rateBPM: 9,
    shape: { inhaleRatio:0.45, holdIn:0.05, exhaleRatio:0.45, holdOut:0.05, curveInhale:"easeInOutSine", curveExhale:"easeInOutSine" },
    variability: { enabled:true, jitterPct:0.03, seed:137 },
  };
  const breath = new BreathRuntime(breathCfg);

  // --- Gate geometry (CSS px) ---
  const gate = { cx: 0, cy: 0, r: 0 };
  function computeGate() {
    const rect = sceneCanvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    gate.cx = w * 0.5;
    gate.cy = h * 0.52;
    gate.r  = Math.min(w, h) * 0.18;
  }
  computeGate();
  sky.setGate({ cx: gate.cx, cy: gate.cy, r: gate.r });

  // --- Facing input (pointer) + smoothing ---
  let facingRaw = { x: 0, y: -1 };
  let facingSm  = { x: 0, y: -1 };

  function updateFacingFromClientXY(clientX:number, clientY:number) {
    const rect = sceneCanvas.getBoundingClientRect();
    const ox = gate.cx;
    const oy = gate.cy + gate.r * 1.05;       // spiral origin (matches ribbon)
    facingRaw.x = clientX - rect.left - ox;
    facingRaw.y = clientY - rect.top  - oy;
  }

  // capture anywhere on page (works with mouse/pen/touch)
  window.addEventListener("pointermove", (e) => updateFacingFromClientXY(e.clientX, e.clientY), { passive:true });

  // --- Chamber ---
// Chamber
let chamberDef = PRESET.def;
const chamber = new SolarSpiralGateChamber(
  sceneCtx,
  () => ({ cx: gate.cx, cy: gate.cy, r: gate.r }),
  chamberDef,
  { breathPhase: () => breath.state.tCycle, breath01: () => breath.state.breath01 },
  () => facingSm
);

  // --- helpers: normalize + alignment for SkyGL flow ---
  function norm(x:number,y:number){ const m=Math.hypot(x,y)||1; return {x:x/m,y:y/m}; }
  function tangentAt(t:number, rGate:number){
    const a = rGate * 0.75;
    const thetaMax = TURNS * TWO_PI * LENGTH;
    const th = t * thetaMax;
    const b = (a*0.65)/(TURNS*TWO_PI);
    const r = a + b*th;
    const dx = b*Math.cos(th) - r*Math.sin(th);
    const dy = b*Math.sin(th) + r*Math.cos(th);
    const m = Math.hypot(dx,dy)||1; return { x:dx/m, y:dy/m };
  }

  // --- Resize / DPR ---
  function handleResize() {
    sizeCanvas(glCanvas);
    rescaleScene();
    computeGate();
    sky.setGate({ cx: gate.cx, cy: gate.cy, r: gate.r }); // keep GL in sync
  }
  let lastDPR = window.devicePixelRatio || 1;
  function watchDPR() {
    const now = window.devicePixelRatio || 1;
    if (Math.abs(now - lastDPR) > 1e-3) { lastDPR = now; handleResize(); }
  }
  window.addEventListener("resize", handleResize);

  // --- RAF ---
  let raf = 0;
  let last = performance.now();
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    const dt = (t - last) / 1000; last = t;

    watchDPR();
    breath.tick(dt);

    // smooth + normalize facing
    const m = Math.hypot(facingRaw.x, facingRaw.y) || 1;
    const nx = facingRaw.x / m, ny = facingRaw.y / m;
    const a  = 0.18; // smoothing
    facingSm.x += (nx - facingSm.x) * a;
    facingSm.y += (ny - facingSm.y) * a;

    // compute alignment once here for GL flow
    const tHat = tangentAt(0.62, gate.r);
    const fHat = norm(facingSm.x, facingSm.y);
    const align = Math.max(0, Math.min(1, 0.5 * (1 + tHat.x*fHat.x + tHat.y*fHat.y)));
    sky.setFlow(align);

    // feed breath + render GL
    sky.setBreath({ breath01: breath.state.breath01, breathSS: breath.state.breathSS, velocity: breath.state.velocity });
    sky.render(t / 1000);

    // clear and draw 2D on top
    sceneCtx.clearRect(0, 0, sceneCanvas.clientWidth, sceneCanvas.clientHeight);
    chamber.update(dt);
  }
  handleResize();
  raf = requestAnimationFrame(frame);

  // --- unmount ---
  function unmount() {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", handleResize);
    try { root.removeChild(sceneCanvas); } catch {}
    try { root.removeChild(glCanvas); } catch {}
  }
  return { unmount };

  attachHotSwap(sky, (d) => { chamberDef = d; /* construct a new PAL in chamber by recreating it if needed */ });

}
