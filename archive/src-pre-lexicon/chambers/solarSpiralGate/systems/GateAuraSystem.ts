import type { ChamberSystem, ChamberCtx } from "@engine/ChamberSystem"
import { createGateFlash, triggerGateFlash, updateGateFlash, gateFlashAlpha } from "@systems/gate/gateFlash"

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
      const { g, cx, cy, rGate } = ctx;
      const alpha = gateFlashAlpha(flash);
      const R = rGate * 1.25 + flash.radiusGain;

      const prev = g.globalCompositeOperation;
      g.globalCompositeOperation = "lighter";

      const grad = g.createRadialGradient(cx, cy, Math.max(1, R * 0.25), cx, cy, R);
      grad.addColorStop(0.00, `rgba(210,225,255, ${alpha})`);
      grad.addColorStop(0.35, `rgba(200,220,255, ${alpha * 0.55})`);
      grad.addColorStop(1.00, `rgba(180,210,255, 0)`);
      g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();

      g.lineWidth = Math.max(1.5, Math.min(6, 0.02 * R));
      g.strokeStyle = `rgba(235,245,255, ${alpha * 0.7})`;
      g.beginPath(); g.arc(cx, cy, R * 0.92, 0, Math.PI * 2); g.stroke();

      g.globalCompositeOperation = prev;
    }
  };
}
