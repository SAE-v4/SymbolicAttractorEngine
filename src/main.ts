import {
  BreathRuntime,
  type BreathConfig,
} from "@systems/breath/BreathRuntime";
import { SkyGLRenderer } from "@renderers/skygl/skyGLRenderer";
import { SolarSpiralGateChamber } from "@chambers/solarSpiralGate/SolarSpiralGateChamber";
import { SceneCanvas } from "@chambers/solarSpiralGate/spiral/SceneCanvas";
import { startApp } from "./app/AppShell";

import {
  SOLAR_SPIRAL_CFG,
  SOLAR_RING_CLOCK,
  SOLAR_TRAVELER_CFG,
  SOLAR_WITNESS_CFG,
  SOLAR_VISUALS,
} from "@chambers/presets/solarPresets";

const legacyInit = function () {
  // --- base DOM ---
  const root = document.getElementById("engine-root")!;
  const baseCanvas = document.getElementById(
    "engine-canvas"
  ) as HTMLCanvasElement;

  // make sure the root stacks layers correctly
  Object.assign(root.style, { position: "relative" });
  Object.assign(baseCanvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    zIndex: "0",
  });

  // DPR-safe sizing
  function sizeCanvas(c: HTMLCanvasElement) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return dpr;
  }

  // attach 2D ctx scaled to DPR so drawing uses CSS pixels
  function attach2D(c: HTMLCanvasElement) {
    const g = c.getContext("2d", { alpha: true, colorSpace: "srgb" })!;
    const rescale = () => {
      const dpr = sizeCanvas(c);
      g.setTransform(1, 0, 0, 1, 0, 0); // reset
      g.scale(dpr, dpr); // now units == CSS px
    };
    rescale();
    return { g, rescale };
  }

  // --- GL sky on the base canvas ---
  sizeCanvas(baseCanvas);
  const sky = new SkyGLRenderer(baseCanvas);

  // --- scene canvas (2D overlay) ---
  const scene = document.createElement("canvas");
  scene.id = "scene-canvas";
  Object.assign(scene.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    zIndex: "10",
    pointerEvents: "none",
  });
  root.appendChild(scene);
  const { g: sceneCtx, rescale: rescaleScene } = attach2D(scene);

  const scenePainter = new SceneCanvas(scene, sceneCtx);

  const chamber = new SolarSpiralGateChamber(
    sceneCtx,
    () => breath.state,
    () => breath.state.tCycle,
    () => ({ cx: gate.cx, cy: gate.cy, r: gate.r }),
    scenePainter,
    SOLAR_SPIRAL_CFG,
    SOLAR_RING_CLOCK,
    SOLAR_TRAVELER_CFG
  );

  // --- Breath runtime ---
  const breathCfg: BreathConfig = {
    mode: "freeRun",
    rateBPM: 9,
    shape: {
      inhaleRatio: 0.45,
      holdIn: 0.05,
      exhaleRatio: 0.45,
      holdOut: 0.05,
      curveInhale: "easeInOutSine",
      curveExhale: "easeInOutSine",
    },
    variability: { enabled: true, jitterPct: 0.03, seed: 137 },
  };
  const breath = new BreathRuntime(breathCfg);

  // --- gate geometry provider (CSS px; ctx is scaled to DPR) ---
  let gate = { cx: 0, cy: 0, r: 0 };
  function computeGate() {
    const rect = scene.getBoundingClientRect();
    const w = rect.width,
      h = rect.height;
    gate.cx = w * 0.5;
    gate.cy = h * 0.52; // tiny lift if you like
    gate.r = Math.min(w, h) * 0.18; // tune to taste
  }
  computeGate();

  // --- Resize handling (both canvases + gate) ---
  function handleResize() {
    sizeCanvas(baseCanvas); // SkyGL will read the canvas size each frame
    rescaleScene(); // keep 2D in CSS px
    computeGate(); // update geo in CSS px
  }
  window.addEventListener("resize", handleResize);
  handleResize();

  // --- Simple HUD (optional) ---
  const hud = document.createElement("div");
  hud.className = "hud";
  hud.style.cssText =
    "position:fixed;left:12px;bottom:12px;color:#9ecbff;font:12px/1.2 monospace;background:#0a1422cc;padding:8px 10px;border-radius:8px;z-index:99";
  document.body.appendChild(hud);

  // --- RAF loop ---
  let last = performance.now();
  function frame(t: number) {
    const dt = (t - last) / 1000;
    last = t;

    breath.tick(dt);

    sky.setBreath({
      breath01: breath.state.breath01,
      breathSS: breath.state.breathSS,
      velocity: breath.state.velocity,
    });
    sky.render(t / 1000);

    // clear the scene overlay to transparent (CSS px since ctx is scaled)
    sceneCtx.clearRect(0, 0, scene.clientWidth, scene.clientHeight);

    chamber.update(dt); // note: update(dt) only; providers handle state

    hud.textContent =
      `phase: ${breath.state.phase}  ` +
      `breath01: ${breath.state.breath01.toFixed(3)}  ` +
      `velocity: ${breath.state.velocity.toFixed(3)}  ` +
      `tCycle: ${breath.state.tCycle.toFixed(3)}`;

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const q = new URLSearchParams(location.search);
if (q.get('appshell')==='1') { startApp(document.getElementById('engine-root')!); }
else { legacyInit(); }
