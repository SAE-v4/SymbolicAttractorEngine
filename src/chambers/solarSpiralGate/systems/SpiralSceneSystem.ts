// src/chambers/solarSpiralGate/systems/SpiralSceneSystem.ts
import type { ChamberSystem } from "@engine/ChamberSystem";
import { genSpiralPolylinePoints } from "../spiral/SpiralGenerator";
import { SceneCanvas } from "../spiral/SceneCanvas";
import type { Knot, SpiralConfig, RingClockConfig, TravelerConfig } from "../spiral/types";

const applyBreathScale = (r: number, breathSS: number, eps: number) => r * (1 + eps * breathSS);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Cache = {
  pts: [number, number][];
  spiralScale: number;
  ribbonWidth: number;
  travelerPos: [number, number];
};

export function createSpiralSceneSystem(
  painter: SceneCanvas,
  cfg: SpiralConfig,
  ring: RingClockConfig,
  travelerCfg: TravelerConfig,
  opts?: { stepsPerTurn?: number; knotStride?: number }
): ChamberSystem {
  const stepsPerTurn = opts?.stepsPerTurn ?? 160;
  const knotStride   = opts?.knotStride   ?? 80;

  let knots: Knot[] = [];
  let knotGlow: number[] = [];
  let ringPrev = ring.rBase;

  // traveler anim state
  let travelerIdx = travelerCfg?.startIndex ?? 0;
  let moveFrom = travelerIdx;
  let moveTo   = travelerIdx;
  let moveT    = 1;                           // 1 = at target
  const moveDur  = travelerCfg?.moveDur  ?? 0.6;
  const leanGain = travelerCfg?.leanGain ?? 0.04;

  let cache: Cache | null = null;

  function rebuildKnots(baseBreathSS = 0) {
    const dense = genSpiralPolylinePoints(cfg, stepsPerTurn, baseBreathSS, cfg.breathe.scaleEpsilon);
    const ks: Knot[] = [];
    for (let i = 0; i < dense.length; i += knotStride) {
      const [nx, ny] = dense[i];
      ks.push({ theta: Math.atan2(ny, nx), r: Math.hypot(nx, ny), pos: [nx, ny] });
    }
    knots = ks;
    knotGlow = new Array(knots.length).fill(0);

    travelerIdx = clamp(travelerIdx, 0, Math.max(0, knots.length - 1));
    moveFrom = moveTo = travelerIdx;
    moveT = 1;
  }
  rebuildKnots(0);

  return {
    id: "spiral-scene",
    z: 20,

    tick(dt, ctx) {
      const { breath } = ctx;

      const spiralScale = 1 + cfg.breathe.scaleEpsilon * breath.breathSS;
      const ribbonWidth = 1 + cfg.breathe.widthGain     * breath.breath01;

      // ring radius in normalized units
      const ringR = ring.rBase + ring.rGain * breath.breath01;

      // gating → start traveler move
      for (let i = travelerIdx; i < knots.length; i++) {
        const rK = applyBreathScale(knots[i].r, breath.breathSS, cfg.breathe.scaleEpsilon);
        if (ringPrev < rK && ringR >= rK) {
          moveFrom = travelerIdx;
          moveTo = i;
          moveT = 0;
          knotGlow[i] = 1;
          break;
        }
      }
      ringPrev = ringR;

      // decay knot glows
      for (let i = 0; i < knotGlow.length; i++) {
        knotGlow[i] = Math.max(0, knotGlow[i] - dt * 2.2);
      }

      // fresh polyline for this frame (already morphs with breathSS)
      const pts = genSpiralPolylinePoints(cfg, stepsPerTurn, breath.breathSS, cfg.breathe.scaleEpsilon);

      // traveler easing
      if (moveT < 1) {
        moveT = Math.min(1, moveT + dt / Math.max(0.001, moveDur));
        if (moveT >= 1) travelerIdx = moveTo;
      }

      // eased traveler position + subtle breath-velocity “lean”
      const a = knots[moveFrom]?.pos ?? knots[travelerIdx]?.pos ?? [0, 0];
      const b = knots[moveTo]?.pos   ?? knots[travelerIdx]?.pos ?? [0, 0];
      const te = easeOutCubic(moveT);
      let tx = lerp(a[0], b[0], te);
      let ty = lerp(a[1], b[1], te);

      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const lean = (travelerCfg?.leanGain ?? leanGain) * (breath.velocity || 0);
      tx += nx * lean; ty += ny * lean;

      cache = { pts, spiralScale, ribbonWidth, travelerPos: [tx, ty] };
    },

    render(ctx) {
      if (!cache) return;
      const { pts, spiralScale, ribbonWidth, travelerPos } = cache;

      // ribbon
      painter.drawSpiralPolyline(pts, ribbonWidth);

      // knots
      for (let i = 0; i < knots.length; i++) {
        painter.drawKnot(knots[i], spiralScale, knotGlow[i]);
      }

      // traveler
      painter.drawTraveler(travelerPos, spiralScale, ctx.breath.breath01);
    },
  };
}
