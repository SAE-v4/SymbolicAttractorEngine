import type { ChamberSystem, ChamberCtx } from "@engine/ChamberSystem";
import {
  createGateFlash,
  triggerGateFlash,
  updateGateFlash,
  gateFlashAlpha,
} from "@systems/gate/gateFlash";
import { auraBase } from "@systems/colorBreath";
import { mixOKLCH, oklchStr } from "@utils/oklch";
import { PALETTE } from "@config/palette";

export function createGateAuraSystem(): ChamberSystem {
  const flash = createGateFlash();
  let prevCycle = 0;

  return {
    id: "gate-aura",
    z: 10, // draw early, behind spiral/actors
    tick(dt, ctx) {
      if (prevCycle > 0.95 && ctx.tCycle < 0.05) triggerGateFlash(flash, 1.0);
      prevCycle = ctx.tCycle;
      updateGateFlash(flash, dt);
    },
render(ctx) {
  if (flash.energy <= 0) return;
  const { g, cx, cy, rGate, breath } = ctx;
  const alpha = gateFlashAlpha(flash);
  const R = rGate * 1.25 + flash.radiusGain;

  // pick hue from breath (dawnSteel → septemberBlue)
  const base = mixOKLCH(PALETTE.dawnSteel.aura, PALETTE.septemberBlue.aura, Math.pow(breath.breath01, 0.75));
  const c0 = oklchStr({ ...base, a: alpha });
  const c1 = oklchStr({ ...base, a: alpha * 0.55 });

  const prev = g.globalCompositeOperation;
  g.globalCompositeOperation = "lighter";
  const fg = g.createRadialGradient(cx, cy, Math.max(1, R * 0.25), cx, cy, R);
  fg.addColorStop(0.00, c0);
  fg.addColorStop(0.35, c1);
  fg.addColorStop(1.00, oklchStr({ ...base, a: 0 }));
  g.fillStyle = fg;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  // (optional ring stroke left as-is)
  g.globalCompositeOperation = prev;
}
  };
}
