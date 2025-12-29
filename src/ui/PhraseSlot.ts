// src/ui/PhraseSlot.ts

export interface SlotStamp {
  kind: "spiral" | "line" | "zigzag";
  dir: -1 | 0 | 1;       // ccw, none, cw
  weight01: number;      // strength
  speed01: number;
  jag01: number;
}

export class PhraseSlot {
  filled = false;
  strength = 0;
  stamp: SlotStamp | null = null;

  fill(strength: number, stamp?: SlotStamp) {
    this.filled = true;
    this.strength = Math.max(0, Math.min(1, strength));
    this.stamp = stamp ?? null;
  }

  reset() {
    this.filled = false;
    this.strength = 0;
    this.stamp = null;
  }
}