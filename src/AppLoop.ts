
//src/AppLoop.ts

import { BreathEngine } from "./breath/BreathEngine";
import { PhraseWheel } from "./ui/PhraseWheel";
import { GestureCapture } from "./input/GestureCapture";
import { analyzeGesture } from "./input/analyzeGesture";
import type { PhraseMode } from "@/types/core";
import type { GestureMetrics } from "@/types/core";
import type { Phrase } from "@/types/phrase";

export type PhraseCompleteCallback = (phrase: Phrase) => void;

export type FrameCallback = (now: number) => void;

export class AppLoop {
  breath = new BreathEngine();
  wheel = new PhraseWheel();
  gesture = new GestureCapture();
  phraseMode: PhraseMode = "compose";
  lastGesture: GestureMetrics | null = null;

  private rafId: number | null = null;
  private onFrame: FrameCallback | null = null;

  private lastPhase: string | null = null;

  setPhraseMode(mode: PhraseMode) {
    this.phraseMode = mode;
  }

  start(onFrame: FrameCallback) {
    this.onFrame = onFrame;
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    if (this.rafId == null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.onFrame = null;
  }

  tick = (now: number) => {
    this.breath.update(now);
    this.wheel.updateFromBreath(this.breath);

    // One-breath mode: clear phrase at start of each inhale (if not mid-gesture)
    if (
      this.phraseMode === "oneBreath" &&
      !this.gesture.active &&
      this.lastPhase !== "inhale" &&
      this.breath.phase === "inhale"
    ) {
      this.wheel.reset();
      this.wheel.setLiveStrength(0);
    }

    this.lastPhase = this.breath.phase;

    this.onFrame?.(now);
    this.rafId = requestAnimationFrame(this.tick);
  };

  onPointerDown(x: number, y: number) {
    this.gesture.start(x, y);
  }

  onPointerMove(x: number, y: number) {
    this.gesture.move(x, y);
    if (!this.gesture.active) return;

    const metrics = analyzeGesture(this.gesture.points);
    this.lastGesture = metrics;
    this.wheel.setLiveStrength(metrics.strength);
  }

  onPhraseComplete: PhraseCompleteCallback | null = null;

  setOnPhraseComplete(cb: PhraseCompleteCallback | null) {
    this.onPhraseComplete = cb;
  }

  private makePhrase(now: number): Phrase {
    return {
      id: `${Math.floor(now)}`,
      at: now,
      wheel: this.wheel.getState(),
      breath: { phase: this.breath.phase, progress: this.breath.progress },
      gesture: this.lastGesture ?? undefined,
    };
  }


  onPointerUp(x: number, y: number) {
    const points = this.gesture.end(x, y);
    this.wheel.setLiveStrength(0);
    if (!points) return;

    const metrics = analyzeGesture(points);
    this.lastGesture = metrics;

    if (metrics.strength < 0.18) return;

    const filled = this.wheel.tryFillActiveSlot(metrics);

    if (filled && this.wheel.isComplete()) {
      const now = performance.now();
      const phrase = this.makePhrase(now);
      this.onPhraseComplete?.(phrase);

      setTimeout(() => this.wheel.reset(), 250);
    }
  }


  cancelGesture() {
    this.gesture.active = false;
    this.gesture.points = [];
    this.wheel.setLiveStrength(0);
  }

  clearActiveSlot() {
    this.wheel.clearActiveSlot();
    this.wheel.setLiveStrength(0);
  }

  resetPhrase() {
    this.wheel.reset();
    this.wheel.setLiveStrength(0);
    this.cancelGesture();
  }

}
