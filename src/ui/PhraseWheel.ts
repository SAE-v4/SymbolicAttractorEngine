// src/ui/PhraseWheel.ts

import type { PhraseWheelState, PhraseSlotState, SlotIndex, GestureMetrics } from "@/types/core";
import { BreathEngine } from "../breath/BreathEngine";
import { PhraseSlot } from "./PhraseSlot";

function classifyKind(m: GestureMetrics): "spiral" | "zigzag" | "line" {
  const curv = Math.abs(m.curvature);
  if (curv > 0.18) return "spiral";
  if (m.jaggedness > 0.55) return "zigzag";
  return "line";
}


export class PhraseWheel {
    slots: PhraseSlot[] = Array.from({ length: 5 }, () => new PhraseSlot());
    activeSlotIndex: SlotIndex = 0;

    updateFromBreath(breath: BreathEngine) {
        const { phase, progress } = breath;

        if (phase === "inhale") {
            this.activeSlotIndex = (progress < 0.5 ? 0 : 1) as SlotIndex;
        } else if (phase === "pause") {
            this.activeSlotIndex = 2;
        } else if (phase === "exhale") {
            this.activeSlotIndex = (progress < 0.5 ? 3 : 4) as SlotIndex;
        }
    }

tryFillActiveSlot(metrics: GestureMetrics): boolean {
  const slot = this.slots[this.activeSlotIndex];
  if (slot.filled) return false;

  const dir: -1 | 0 | 1 =
    metrics.curvature > 0.08 ? 1 : metrics.curvature < -0.08 ? -1 : 0;

  slot.fill(metrics.strength, {
    kind: classifyKind(metrics),
    dir,
    weight01: metrics.strength,
    speed01: metrics.speed,
    jag01: metrics.jaggedness,
  });

  return true;
}


    isComplete(): boolean {
        return this.slots.every((s) => s.filled);
    }

    reset() {
        this.slots.forEach((s) => s.reset());
    }

    clearSlot(index: SlotIndex) {
        this.slots[index].reset();
    }

    clearActiveSlot() {
        this.clearSlot(this.activeSlotIndex);
    }

    liveStrength = 0; // 0..1, preview during active gesture

    setLiveStrength(strength: number) {
        this.liveStrength = Math.max(0, Math.min(1, strength));
    }

    getState(): PhraseWheelState {
        const slots: PhraseSlotState[] = this.slots.map((s, i) => {
            const isActive = i === this.activeSlotIndex;
            const preview = isActive && !s.filled ? this.liveStrength : 0;

            return {
                filled: s.filled,
                strength: s.filled ? s.strength : preview,
                stamp: s.stamp ?? undefined,
            };
        });

        return { active: this.activeSlotIndex, slots };
    }

}
