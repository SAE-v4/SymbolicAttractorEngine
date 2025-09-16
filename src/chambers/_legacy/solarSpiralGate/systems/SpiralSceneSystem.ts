// src/chambers/solarSpiralGate/systems/SpiralSceneSystem.ts
import type { ChamberSystem } from "@engine/ChamberSystem";
import { genSpiralPolylinePoints } from "../spiral/SpiralGenerator";
import { SceneCanvas } from "../spiral/SceneCanvas";
import type {
  Knot,
  SpiralConfig,
  RingClockConfig,
  TravelerConfig,
} from "../spiral/types";

const applyBreathScale = (r: number, breathSS: number, eps: number) =>
  r * (1 + eps * breathSS);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
let tWave = 0;

type Cache = {
  pts: [number, number][];
  spiralScale: number;
  ribbonWidth: number;
  travelerPos: [number, number];
  travelerAngle: number;
};

export function createSpiralSceneSystem(
  painter: SceneCanvas,
  cfg: SpiralConfig,
  ring: RingClockConfig,
  travelerCfg: TravelerConfig,
  opts?: { stepsPerTurn?: number; knotStride?: number }
): ChamberSystem {
  const stepsPerTurn = opts?.stepsPerTurn ?? 160;
  const knotStride = opts?.knotStride ?? 80;

  let denseBase: [number, number][] = []; // base path at breathSS=0

  let knots: Knot[] = [];
  let knotGlow: number[] = [];
  let ringPrev = ring.rBase;

  // traveler anim state
  let travelerIdx = travelerCfg?.startIndex ?? 0;
  let moveFrom = travelerIdx;
  let moveTo = travelerIdx;
  let moveT = 1; // 1 = at target
  const moveDur = travelerCfg?.moveDur ?? 0.6;
  const leanGain = travelerCfg?.leanGain ?? 0.04;

  let cache: Cache | null = null;

  function rebuildKnots(baseBreathSS = 0) {
    const dense = genSpiralPolylinePoints(
      cfg,
      stepsPerTurn,
      baseBreathSS,
      cfg.breathe.scaleEpsilon
    );
    const ks: Knot[] = [];
    for (let i = 0; i < dense.length; i += knotStride) {
      const [nx, ny] = dense[i];
      ks.push({
        theta: Math.atan2(ny, nx),
        r: Math.hypot(nx, ny),
        pos: [nx, ny],
      });
    }
    knots = ks;
    knotGlow = new Array(knots.length).fill(0);

    travelerIdx = clamp(travelerIdx, 0, Math.max(0, knots.length - 1));
    moveFrom = moveTo = travelerIdx;
    moveT = 1;
    denseBase = genSpiralPolylinePoints(
      cfg,
      stepsPerTurn,
      0,
      cfg.breathe.scaleEpsilon
    );
  }
  rebuildKnots(0);

  return {
    id: "spiral-scene",
    z: 20,

    tick(dt, ctx) {
      const { breath } = ctx;

      const spiralScale = 1 + cfg.breathe.scaleEpsilon * breath.breathSS;
      const ribbonWidth = 1 + cfg.breathe.widthGain * breath.breath01;

      // ring radius in normalized units
      const ringR = ring.rBase + ring.rGain * breath.breath01;

      // gating → start traveler move (first rising-edge crossing)
      for (let i = travelerIdx; i < knots.length; i++) {
        const rK = applyBreathScale(
          knots[i].r,
          breath.breathSS,
          cfg.breathe.scaleEpsilon
        );
        if (ringPrev < rK && ringR >= rK) {
          // step one knot at a time
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

      // fresh (scaled) polyline for this frame → used to draw the ribbon
      const pts = genSpiralPolylinePoints(
        cfg,
        stepsPerTurn,
        breath.breathSS,
        cfg.breathe.scaleEpsilon
      );

      // traveler easing progress
      if (moveT < 1) {
        moveT = Math.min(
          1,
          moveT + dt / Math.max(0.001, travelerCfg?.moveDur ?? 0.6)
        );
        if (moveT >= 1) travelerIdx = moveTo;
      }

      // --- move ALONG the spiral polyline (base path), not a chord ---
      // map knot indices to denseBase indices (we picked knots via `knotStride`)
      const fromI = Math.max(
        0,
        Math.min(denseBase.length - 2, moveFrom * (opts?.knotStride ?? 80))
      );
      const toI = Math.max(
        0,
        Math.min(denseBase.length - 1, moveTo * (opts?.knotStride ?? 80))
      );

      const te = 1 - Math.pow(1 - moveT, 3); // easeOutCubic
      const fIndex = fromI + (toI - fromI) * te;
      const i0 = Math.max(
        0,
        Math.min(denseBase.length - 2, Math.floor(fIndex))
      );
      const tLocal = fIndex - i0;

      // interpolate along the local segment of the base path
      const ax = denseBase[i0][0],
        ay = denseBase[i0][1];

      const bx = denseBase[i0 + 1][0],
        by = denseBase[i0 + 1][1];

      let tx = ax + (bx - ax) * tLocal;
      let ty = ay + (by - ay) * tLocal;

      const angle = Math.atan2(by - ay, bx - ax);

      // subtle “lean” using the segment normal, scaled by breath velocity
      const dx = bx - ax,
        dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len,
        ny = dx / len;
      const lean = (travelerCfg?.leanGain ?? 0.04) * (breath.velocity || 0);
      tx += nx * lean;
      ty += ny * lean;

      tWave += dt;

      // cache for render (add tWave)
      (this as any)._cache = {
        pts,
        spiralScale,
        ribbonWidth,
        travelerPos: [tx, ty] as [number, number],
        tWave,
      };
    },

    render(ctx) {
  
      const { breath } = ctx;
      const { pts, spiralScale, ribbonWidth, travelerPos, tWave } = (
        this as any
      )._cache!;

// Peristaltic ribbon
painter.drawRibbonPeristaltic(pts, ribbonWidth, {
  time: tWave,
  breath01: breath.breath01,
  breathSS: breath.breathSS,
  amp: 0.12,        // visual subtlety; try 0.08–0.14
  lambda: 0.25,     // one wave every 1/4 of the path
  freq: 0.2,       // 0.2–0.35 Hz reads well
  widthGain: 0.08,  // how much width changes
  alphaGain: 0.10,  // how much glow changes
  segmentStride: 2, // set 2 on mobile if needed
});

      // Knots
      for (let i = 0; i < knots.length; i++) {
        painter.drawKnot(knots[i], spiralScale, knotGlow[i]);
      }

      // Traveler
      painter.drawTraveler(travelerPos, spiralScale, breath.breath01);
    },
  };
}
