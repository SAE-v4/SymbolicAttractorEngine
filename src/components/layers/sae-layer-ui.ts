// src/components/layers/sae-layer-ui.ts

import { AppLoop } from "@/AppLoop";
import type { PhraseSlotState, WorldState } from "@/types/core";
import { CanvasPipeline2D } from "@/render/CanvasPipeline2D";
import { BackgroundLayer } from "@/render/layers/BackgroundLayer";
import { PhraseWheelLayer } from "@/render/layers/PhraseWheelLayer";
import type { RenderConfig } from "@/types/render";
import type { Phrase } from "@/types/phrase";


function makeWorld(): WorldState {
  const slots: PhraseSlotState[] = Array.from({ length: 5 }, () => ({
    filled: false,
    strength: 0,
  }));

  return {
    breath: { phase: "inhale", progress: 0 },
    wheel: { active: 0, slots },
  };
}

const DEFAULT_CFG: RenderConfig = {
  wheel: { radiusFrac: 0.28, thicknessFrac: 0.09, gapRad: 0.12 },
  debug: { showSafeArea: true, showCentroid: false },
};

export class SaeLayerUI extends HTMLElement {
  private shadow: ShadowRoot;
  private canvas: HTMLCanvasElement | null = null;

  private pipeline: CanvasPipeline2D | null = null;
  private world: WorldState = makeWorld();
  private cfg: RenderConfig = DEFAULT_CFG;

  private loop = new AppLoop();

  private activePointers = new Map<number, { x0: number; y0: number; t0: number; moved: boolean }>();
  private primaryPointerId: number | null = null;

  private longPressTimer: number | null = null;
  private longPressFired = false;

  private twoFingerCandidate = false;
  private twoFingerT0 = 0;

  private static readonly LONG_PRESS_MS = 550;
  private static readonly TAP_MAX_MS = 260;
  private static readonly MOVE_TOL_PX = 14;

  private lastPhrase: Phrase | null = null;
  private phraseFlashUntil = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    if (!this.canvas) throw new Error("sae-layer-ui: canvas not created");

    this.initPipeline();
    this.bindEvents();

    // Start the single source-of-truth loop
    this.loop.start((now) => {
      this.syncWorldFromLoop();
      this.pipeline?.frame(this.world, now);
    });

    this.loop.setOnPhraseComplete((phrase) => {
      this.lastPhrase = phrase;
      this.phraseFlashUntil = performance.now() + 450;

      // Emit for future layers (garden/hive) to listen to
      this.dispatchEvent(new CustomEvent("sae:phrase-complete", {
        bubbles: true,
        composed: true,
        detail: phrase,
      }));
    });
  }

  disconnectedCallback() {
    this.loop.stop();
    this.unbindEvents();
  }

  private bindEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("lostpointercapture", this.onLostPointerCapture);
  }

  private unbindEvents() {
    if (!this.canvas) return;

    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("lostpointercapture", this.onLostPointerCapture);
  }

  private canvasPoint(e: PointerEvent) {
    const canvas = this.canvas!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.canvas) return;

    const p = this.canvasPoint(e);
    this.activePointers.set(e.pointerId, { x0: p.x, y0: p.y, t0: performance.now(), moved: false });

    // Primary pointer drives the gesture
    if (this.primaryPointerId === null) {
      this.primaryPointerId = e.pointerId;
      this.longPressFired = false;

      this.canvas.setPointerCapture(e.pointerId);
      this.loop.onPointerDown(p.x, p.y);

      // Long-press: clear active slot (only meaningful if already filled)
      this.clearLongPressTimer();
      this.longPressTimer = window.setTimeout(() => {
        if (this.primaryPointerId !== e.pointerId) return;
        const info = this.activePointers.get(e.pointerId);
        if (!info || info.moved) return;

        // Only clear if active slot is currently filled
        const activeIdx = this.loop.wheel.activeSlotIndex;
        if (!this.loop.wheel.slots[activeIdx].filled) return;

        this.longPressFired = true;
        this.loop.clearActiveSlot();
        this.loop.cancelGesture(); // prevents fill-on-release for the canceled gesture
      }, SaeLayerUI.LONG_PRESS_MS);

      return;
    }

    // Secondary pointer: two-finger tap candidate (reset phrase)
    if (this.activePointers.size === 2) {
      this.twoFingerCandidate = true;
      this.twoFingerT0 = performance.now();
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.canvas) return;

    const info = this.activePointers.get(e.pointerId);
    if (info) {
      const p = this.canvasPoint(e);
      const dx = p.x - info.x0;
      const dy = p.y - info.y0;
      if (Math.hypot(dx, dy) > SaeLayerUI.MOVE_TOL_PX) info.moved = true;
    }

    // Only forward movement from the primary pointer
    if (this.primaryPointerId !== e.pointerId) return;

    // If user moves, long-press should no longer fire
    const primaryInfo = this.activePointers.get(e.pointerId);
    if (primaryInfo?.moved) this.clearLongPressTimer();

    const p = this.canvasPoint(e);
    this.loop.onPointerMove(p.x, p.y);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.canvas) return;

    const wasPrimary = this.primaryPointerId === e.pointerId;

    // Two-finger tap detection: if we had two pointers and neither moved much and timing is short
    const endedInfo = this.activePointers.get(e.pointerId);
    this.activePointers.delete(e.pointerId);

    if (this.twoFingerCandidate) {
      const dt = performance.now() - this.twoFingerT0;
      const moved = endedInfo?.moved ?? true;

      // Candidate ends when one finger lifts; we only trigger when *both* are now up
      if (this.activePointers.size === 0) {
        if (dt <= SaeLayerUI.TAP_MAX_MS && !moved && !this.anyPointerMoved()) {
          this.loop.resetPhrase();
        }
        this.twoFingerCandidate = false;
      }
    }

    if (wasPrimary) {
      this.clearLongPressTimer();

      // If long-press cleared the slot, don't also "fill" on release
      if (!this.longPressFired) {
        const p = this.canvasPoint(e);
        this.loop.onPointerUp(p.x, p.y);
      }

      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ok
      }

      this.primaryPointerId = null;
      this.longPressFired = false;
    }
  };

  private onPointerCancel = (e: PointerEvent) => {
    // Treat cancel as ending everything cleanly
    this.activePointers.delete(e.pointerId);

    if (this.primaryPointerId === e.pointerId) {
      this.clearLongPressTimer();
      this.loop.cancelGesture();
      this.primaryPointerId = null;
      this.longPressFired = false;
    }

    if (this.activePointers.size === 0) {
      this.twoFingerCandidate = false;
    }
  };

  private anyPointerMoved() {
    for (const v of this.activePointers.values()) if (v.moved) return true;
    return false;
  }

  private clearLongPressTimer() {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private onLostPointerCapture = (e: PointerEvent) => {
    if (this.primaryPointerId !== e.pointerId) return;
    this.clearLongPressTimer();
    this.loop.cancelGesture();
    this.primaryPointerId = null;
    this.longPressFired = false;
    this.activePointers.clear();
    this.twoFingerCandidate = false;
  };


  private syncWorldFromLoop() {
    // Breath -> WorldState
    this.world.breath.phase = this.loop.breath.phase;
    this.world.breath.progress = this.loop.breath.progress;

    // PhraseWheel -> WorldState (expects PhraseWheel.getState() exists)
    this.world.wheel = this.loop.wheel.getState();

    this.world.gesture = this.loop.lastGesture ?? undefined;

    (this.world as any).phrase = this.lastPhrase ?? undefined;
(this.world as any).phraseFlash01 = this.phraseFlashUntil > performance.now()
  ? 1 - (this.phraseFlashUntil - performance.now()) / 450
  : 0;

  }

  private render() {
    this.shadow.innerHTML = `
      <style>
        :host { display:block; width:100%; height:100%; }
        canvas { width:100%; height:100%; display:block; touch-action:none; }
      </style>
      <canvas></canvas>
    `;

    this.canvas = this.shadow.querySelector("canvas");
  }

  private initPipeline() {
    if (!this.canvas) throw new Error("sae-layer-ui: canvas missing");
    this.pipeline = new CanvasPipeline2D(
      this.canvas,
      [BackgroundLayer, PhraseWheelLayer],
      this.cfg
    );
  }
}

customElements.define("sae-layer-ui", SaeLayerUI);
