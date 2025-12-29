// src/render/layers/PhraseWheelLayer.ts

import type { Layer2D } from "@/types/render";
import type { SlotIndex } from "@/types/core";

let prevActive: number | null = null;
let nextActive: number | null = null;
let blend01 = 1;          // 0..1
const BLEND_MS = 360;     // tweak 200–420

const USE_DIAPHRAGM_WARP = true;

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function easeInOutSine(t: number) {
  t = clamp01(t);
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}

function stampChar(stamp: any): string {
  if (!stamp) return "•";
  if (stamp.kind === "spiral") return stamp.dir > 0 ? "↻" : stamp.dir < 0 ? "↺" : "⟲";
  if (stamp.kind === "zigzag") return "⚡";
  if (stamp.kind === "line") return "—";
  return "•";
}


// shortest signed angular distance a->b in [-π, π]
function angDelta(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function easeOutCubic(t: number) {
  t = clamp01(t);
  return 1 - Math.pow(1 - t, 3);
}

export const PhraseWheelLayer: Layer2D = {
  id: "phrase-wheel",

  draw({ ctx, size, time }, world, cfg) {
    const { breath, wheel } = world;

    // Detect active-slot change and start a blend
    if (nextActive === null) {
      nextActive = wheel.active;
      prevActive = wheel.active;
      blend01 = 1;
    } else if (wheel.active !== nextActive) {
      prevActive = nextActive;
      nextActive = wheel.active;
      blend01 = 0;
    }

    // Advance blend by dt (ms)
    const dt = Math.min(time.dt, 50); // cap first-frame dt spikes (Safari)
    blend01 = Math.min(1, blend01 + dt / BLEND_MS);
    const b = easeInOutSine(blend01);

    const minDim = Math.min(size.cssW, size.cssH);
    const cx = size.cssW * 0.5;
    const cy = size.cssH * 0.72;

    const radius = minDim * cfg.wheel.radiusFrac;
    const thickness = Math.max(6, radius * cfg.wheel.thicknessFrac);

    const slotCount = 5;
    const full = Math.PI * 2;
    const gap = cfg.wheel.gapRad;
    const slotSpan = (full - slotCount * gap) / slotCount;

    // Breath pulse for ACTIVE indicator (inhale up, exhale down, pause near peak)
    const rawPulse =
      breath.phase === "inhale"
        ? breath.progress
        : breath.phase === "exhale"
          ? 1 - breath.progress
          : 0.9;

    const breathPulse = easeInOutSine(rawPulse);

    // Diaphragm warp: centered at bottom (π/2), strongest at breath peak
    const bottomAngle = Math.PI / 2;
    const warpWidth = 0.9; // radians (~50°). Smaller = tighter dent.
    const warpAmt = USE_DIAPHRAGM_WARP ? (-0.08 * radius) * breathPulse : 0;

    // Ghost phrase ring (last completed phrase)
    const phrase = (world as any).phrase as { wheel?: any } | undefined;
    const ghostSlots = phrase?.wheel?.slots as Array<{ filled: boolean; strength: number }> | undefined;

    const ghostBaseA = 0.16;
    const ghostW = Math.max(2, thickness * 0.18);
    const ghostROffset = -Math.min(thickness * 0.95, radius * 0.35);

    ctx.lineCap = "round";

    for (let i = 0; i < slotCount; i++) {
      const idx = i as SlotIndex;
      const start = -Math.PI / 2 + i * (slotSpan + gap);
      const end = start + slotSpan;
      const mid = (start + end) * 0.5;

      // Warp radius locally near bottom
      let r = radius;
      if (warpAmt !== 0) {
        const d = angDelta(mid, bottomAngle);
        const t = clamp01(1 - Math.abs(d) / warpWidth); // 1 at bottom, 0 outside width
        const w = easeInOutSine(t);
        r = radius + warpAmt * w;
      }

      const midR = r + thickness * 0.15; // slightly outside the base ring centreline
      const gx = cx + Math.cos(mid) * midR;
      const gy = cy + Math.sin(mid) * midR;

      // 0) Ghost phrase ring: faint memory behind live ring
      if (ghostSlots) {
        const g = ghostSlots[idx];
        if (g?.filled) {
          const ga = clamp01(ghostBaseA + 0.22 * g.strength);
          const gr = r + ghostROffset;

          // Guard: Canvas arc radius must be positive
          if (gr > 4) {
            ctx.save();
            ctx.lineWidth = ghostW;
            ctx.strokeStyle = `rgba(220,235,255,${ga})`;
            ctx.beginPath();
            ctx.arc(cx, cy, gr, start, end);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      const slot = wheel.slots[idx];

      // Blend highlight between previous and next active slots
      const isPrev = prevActive === idx;
      const isNext = nextActive === idx;
      const activeW = (isPrev ? (1 - b) : 0) + (isNext ? b : 0);

      // 1) Base ring: constant neutral
      const baseA = 0.14;
      ctx.lineWidth = thickness;
      ctx.strokeStyle = `rgba(180,180,210,${baseA})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, end);
      ctx.stroke();

      // 2) Filled slots: stable brighter “memory” stroke
      if (slot.filled) {
        const filledA = clamp01(0.55 + 0.40 * slot.strength);
        ctx.strokeStyle = `rgba(240,240,255,${filledA})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, start, end);
        ctx.stroke();
      }


      // 2b) Filled slot stamp (text glyph)
      if (slot.filled) {
        const st: any = (slot as any).stamp; // depends on your PhraseWheelState extension
        const ch = stampChar(st);

        // weight/intensity influences alpha + tiny size change
        const w01 = clamp01(st?.weight01 ?? slot.strength ?? 0.6);
        const sp01 = clamp01(st?.speed01 ?? 0);

        // Subtle size scaling, readable on phone
        const fontPx = Math.max(12, thickness * (0.55 + 0.20 * w01));

        // Subtle fade with speed so fast gestures “pop” a touch
        const a = clamp01(0.45 + 0.35 * w01 + 0.15 * sp01);

        ctx.save();
        ctx.font = `${Math.round(fontPx)}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Dark halo behind the glyph (critical for filled-bright segments)
        ctx.fillStyle = `rgba(0,0,0,${0.35})`;
        ctx.fillText(ch, gx + 1, gy + 1);

        // Foreground glyph
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillText(ch, gx, gy);

        ctx.restore();
      }



      // 3) Active slot: OUTLINE cursor that breathes (stays visible even over filled)
      if (activeW > 0) {
        const outlineR = r + thickness * 0.90;          // further out = clearer
        const outlineW = Math.max(3, thickness * 0.30); // thicker
        const outlineA = activeW * (0.18 + 0.60 * breathPulse);

        ctx.save();
        ctx.lineCap = "round";

        // dark separator under-stroke
        ctx.lineWidth = outlineW + 2;
        ctx.strokeStyle = `rgba(0,0,0,${activeW * 0.35})`;
        ctx.beginPath();
        ctx.arc(cx, cy, outlineR, start, end);
        ctx.stroke();

        // white outline
        ctx.lineWidth = outlineW;
        ctx.strokeStyle = `rgba(255,255,255,${outlineA})`;
        ctx.beginPath();
        ctx.arc(cx, cy, outlineR, start, end);
        ctx.stroke();

        // // optional inner line (very subtle; comment out if it competes)
        // const innerR = r - thickness * 0.55;
        // const innerA = activeW * (0.03 + 0.12 * breathPulse);
        // ctx.strokeStyle = `rgba(255,255,255,${innerA})`;
        // ctx.beginPath();
        // ctx.arc(cx, cy, innerR, start, end);
        // ctx.stroke();

        // midpoint pip (helps readability on phones)
        const px = cx + Math.cos(mid) * outlineR;
        const py = cy + Math.sin(mid) * outlineR;
        ctx.fillStyle = `rgba(255,255,255,${activeW * (0.20 + 0.55 * breathPulse)})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, thickness * 0.14), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Phrase completion flash (outer halo) — draw ONCE, outside loop
    const flash01 = (world as any).phraseFlash01 as number | undefined;
    if (flash01 !== undefined && flash01 > 0) {
      const t = easeOutCubic(flash01);
      const haloR = radius + thickness * 1.35;
      const haloW = Math.max(4, thickness * 0.42);

      ctx.save();
      ctx.lineCap = "round";

      // dark separator to keep halo legible over bright fills
      ctx.lineWidth = haloW + 3;
      ctx.strokeStyle = `rgba(0,0,0,${0.25 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.stroke();

      // bright halo that fades out
      ctx.lineWidth = haloW;
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Debug overlay: only when showSafeArea is enabled
    if (cfg.debug.showSafeArea) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "12px system-ui";

      ctx.fillText(
        `${breath.phase} ${breath.progress.toFixed(2)} active=${wheel.active} blend=${blend01.toFixed(2)}`,
        10,
        20
      );

      const gm = world.gesture;
      if (gm) {
        const dir = gm.curvature > 0.08 ? "↻" : gm.curvature < -0.08 ? "↺" : "·";
        ctx.fillText(
          `str=${gm.strength.toFixed(2)} curv=${dir}(${gm.curvature.toFixed(2)}) jag=${gm.jaggedness.toFixed(2)} spd=${gm.speed.toFixed(2)}`,
          10,
          36
        );
      } else {
        ctx.fillText(`gesture=—`, 10, 36);
      }
    }
  },
};
