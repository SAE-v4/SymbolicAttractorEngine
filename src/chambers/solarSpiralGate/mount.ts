// src/chambers/solarSpiralGate/mount.ts
import type { ChamberMountOpts } from "@types/Chamber";
import { BreathRuntime, type BreathConfig } from "@systems/breath/BreathRuntime";
import { SkyGLRenderer } from "@renderers/skygl/skyGLRenderer";
// SceneCanvas/painter kept if you still use it elsewhere; otherwise can be removed.
import { SceneCanvas } from "@chambers/solarSpiralGate/spiral/SceneCanvas";
import { SolarSpiralGateChamber } from "./SolarSpiralGateChamber";

export function mountSolarSpiralGate(opts: ChamberMountOpts) {
  const root = opts.root;

  const glCanvas = document.createElement("canvas");
  Object.assign(glCanvas.style, {
    position: "absolute", inset: "0", width: "100%", height: "100%",
    display: "block", zIndex: "0",
  });
  root.appendChild(glCanvas);

  const sceneCanvas = document.createElement("canvas");
  Object.assign(sceneCanvas.style, {
    position: "absolute", inset: "0", width: "100%", height: "100%",
    display: "block", zIndex: "10", pointerEvents: "none",
  });
  root.appendChild(sceneCanvas);

  // --- DPR-safe sizing ---
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
    const rescale = () => {
      const dpr = sizeCanvas(c);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.scale(dpr, dpr);
    };
    rescale();
    return { g, rescale };
  }

  // --- Sky (GL) ---
  sizeCanvas(glCanvas);
  const sky = new SkyGLRenderer(glCanvas);

  // --- Scene 2D ---
  const { g: sceneCtx, rescale: rescaleScene } = attach2D(sceneCanvas);
  const painter = new SceneCanvas(sceneCanvas, sceneCtx); // ok to keep even if not used

  // --- Breath runtime ---
  const breathCfg: BreathConfig = {
    mode: "freeRun",
    rateBPM: 9,
    shape: {
      inhaleRatio: 0.45, holdIn: 0.05, exhaleRatio: 0.45, holdOut: 0.05,
      curveInhale: "easeInOutSine", curveExhale: "easeInOutSine",
    },
    variability: { enabled: true, jitterPct: 0.03, seed: 137 },
  };
  const breath = new BreathRuntime(breathCfg);

  // --- Gate geometry (CSS px)
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

  // --- Chamber (now exposes update(dt)) ---
const chamber = new SolarSpiralGateChamber(
  sceneCtx,
  () => ({ cx: gate.cx, cy: gate.cy, r: gate.r }),
  undefined,
  { breathPhase: () => breath.state.tCycle, breath01: () => breath.state.breath01 }
);

  // --- Resize & DPR watchers ---
  function handleResize() {
    sizeCanvas(glCanvas);
    rescaleScene();
    computeGate();
  }
  let lastDPR = window.devicePixelRatio || 1;
  function watchDPR() {
    const now = window.devicePixelRatio || 1;
    if (Math.abs(now - lastDPR) > 1e-3) { lastDPR = now; handleResize(); }
  }
  window.addEventListener("resize", handleResize);

  // --- RAF loop ---
  let raf = 0;
  let last = performance.now();
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    const dt = (t - last) / 1000; last = t;

    watchDPR();
    breath.tick(dt);

    sky.setBreath({
      breath01: breath.state.breath01,
      breathSS: breath.state.breathSS,
      velocity: breath.state.velocity,
    });
    sky.render(t / 1000);

    // clear 2D (ctx is already scaled to CSS px)
    sceneCtx.clearRect(0, 0, sceneCanvas.clientWidth, sceneCanvas.clientHeight);

    // draw chamber (additive on transparent over SkyGL)
    chamber.update(dt);
  }
  handleResize();
  raf = requestAnimationFrame(frame);

  // --- Unmount hygiene ---
  function unmount() {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", handleResize);
    try { root.removeChild(sceneCanvas); } catch {}
    try { root.removeChild(glCanvas); } catch {}
  }

  return { unmount };
}
