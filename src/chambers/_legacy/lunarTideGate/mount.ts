import type { ChamberMountOpts } from '@types/Chamber';
import { BreathRuntime, type BreathConfig } from '@/systems/_legacy/breath/BreathRuntime';
import { SkyGLRenderer } from '@/chambers/_legacy/solarSpiralGate/renderers/skygl/skyGLRenderer';
import { breathPalette } from '@/color/breathPalette';
import { LUNAR_INDIGO } from '@/color/profiles';
// If you have a GateAuraSystem, import it here:
// import { createGateAuraSystem } from '@systems/gate';

export function mountLunarTideGate(opts: ChamberMountOpts) {
  const root = opts.root;
  Object.assign(root.style, { position: 'relative' });

  const gl = document.createElement('canvas');
  const ui = document.createElement('canvas'); // 2D for aura/debug
  [gl, ui].forEach((c, i) => {
    Object.assign(c.style, { position:'absolute', inset:'0', width:'100%', height:'100%', display:'block', zIndex: String(i?10:0), pointerEvents: i? 'none':'auto' });
    root.appendChild(c);
  });

  // sizing
  const sizeCanvas = (c: HTMLCanvasElement) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = c.getBoundingClientRect();
    const w = Math.floor(r.width * dpr), h = Math.floor(r.height * dpr);
    if (c.width !== w) c.width = w; if (c.height !== h) c.height = h;
    return dpr;
  };
  const g2d = ui.getContext('2d', { alpha: true, colorSpace: 'srgb' })!;
  const rescale2d = () => { const dpr = sizeCanvas(ui); g2d.setTransform(1,0,0,1,0,0); g2d.scale(dpr,dpr); };
  sizeCanvas(gl); rescale2d();

  // sky
  const sky = new SkyGLRenderer(gl);

  // breath
  const breathCfg: BreathConfig = {
    mode:'freeRun', rateBPM: 7.5,
    shape:{ inhaleRatio:0.48, holdIn:0.08, exhaleRatio:0.44, holdOut:0.12, curveInhale:'easeInOutSine', curveExhale:'easeInOutSine' },
    variability:{ enabled:true, jitterPct:0.02, seed: 911 },
  };
  const breath = new BreathRuntime(breathCfg);

  // optional: GateAuraSystem (2D) could be created here

  // loop
  let raf = 0, last = performance.now(), lastDPR = window.devicePixelRatio || 1;
  const onResize = () => { sizeCanvas(gl); rescale2d(); };
  window.addEventListener('resize', onResize);

  function tick(t: number) {
    raf = requestAnimationFrame(tick);
    const dt = (t - last)/1000; last = t;
    const nowDPR = window.devicePixelRatio || 1; if (Math.abs(nowDPR-lastDPR)>1e-3){ lastDPR=nowDPR; onResize(); }

    breath.tick(dt);

    // palette
    const pal = breathPalette(LUNAR_INDIGO, breath.state, { biasExp: 0.85, hueSwayDeg: 2 });
    sky.setColors({
      skyTop: pal.gl.srgb.skyTop,
      skyBot: pal.gl.srgb.skyBot,
      band:   pal.gl.srgb.band,
      halo:   pal.gl.srgb.halo,
      ring:   pal.gl.srgb.ring,
    });
    sky.render(t/1000);

    // simple center aura placeholder (until GateAuraSystem wired)
    g2d.clearRect(0,0,ui.clientWidth, ui.clientHeight);
    const w = ui.clientWidth, h = ui.clientHeight, cx = w*0.5, cy = h*0.52, r = Math.min(w,h)*0.18;
    g2d.save();
    g2d.beginPath(); g2d.arc(cx, cy, r, 0, Math.PI*2);
    g2d.strokeStyle = pal.css.knot; g2d.globalAlpha = 0.25 + 0.25*breath.state.breath01;
    g2d.lineWidth = Math.min(w,h)*0.012; g2d.stroke();
    g2d.restore();
  }
  onResize(); raf = requestAnimationFrame(tick);

  return {
    unmount() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      try { root.removeChild(ui); } catch {}
      try { root.removeChild(gl); } catch {}
    }
  };
}
