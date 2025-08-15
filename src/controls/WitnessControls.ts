// controls/WitnessControls.ts
type GetPos = () => { x: number; y: number } | undefined;

export class WitnessControls {
  private rect!: DOMRect;
  private dragging = false;

  // touch thrust helpers
  private pressTimer: number | null = null;
  private thrustMode = false;
  private pressStartY = 0;
  private lastTapTime = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private setFacing: (dx: number, dy: number) => void,
    private thrust: (amount01: number) => void,
    private getWitnessPos: GetPos
  ) {
    this.rect = canvas.getBoundingClientRect();

    this.canvas.addEventListener("pointerdown", this.onDown);
    addEventListener("pointermove", this.onMove);
    addEventListener("pointerup", this.onUp);
    addEventListener("pointercancel", this.onUp);

    // desktop wheel → thrust
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });

    addEventListener("resize", () => {
      this.rect = this.canvas.getBoundingClientRect();
    });
  }

  private onDown = (e: PointerEvent) => {
    // double-tap burst (mobile convenience)
    const now = performance.now();
    if (now - this.lastTapTime < 260) {
      this.burstThrust();
    }
    this.lastTapTime = now;

    this.dragging = true;
    this.thrustMode = false;
    this.canvas.setPointerCapture?.(e.pointerId);

    // schedule thrust mode if user holds
    this.cancelPressTimer();
    this.pressStartY = e.clientY;
    this.pressTimer = window.setTimeout(() => {
      this.thrustMode = true;
      // initialize from current value so small moves don’t spike
      const cur = Number(this.canvas.dataset.thrust || "0");
      this.thrust(cur);
    }, 220); // hold ~0.22s to enter thrust mode

    this.applyFacingFromPointer(e);
    this.applyPressureThrust(e); // if available
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;

    // if the user moves a lot quickly, cancel the hold → thrust
    if (!this.thrustMode && Math.abs(e.clientY - this.pressStartY) > 8) {
      this.cancelPressTimer();
    }

    if (this.thrustMode) {
      // vertical drag from pressStartY → thrust 0..1
      const deltaY = this.pressStartY - e.clientY; // drag up = positive
      const sens = 1 / 220; // ~220 px for full thrust
      const prev = Number(this.canvas.dataset.thrust || "0");
      let next = prev + deltaY * sens;
      // snap baseline to avoid compounding on every move
      this.pressStartY = e.clientY;
      next = Math.max(0, Math.min(1, next));
      this.canvas.dataset.thrust = String(next);
      this.thrust(next);
    } else {
      this.applyFacingFromPointer(e);
      this.applyPressureThrust(e); // pressure devices update continuously
    }
  };

  private onUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    this.cancelPressTimer();

    // exit thrust mode but keep current thrust value (sticky)
    this.thrustMode = false;
    try { this.canvas.releasePointerCapture?.(e.pointerId); } catch {}
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const pos = this.getWitnessPos?.();
    if (!pos) return;

    const prev = Number(this.canvas.dataset.thrust || "0.0");
    const delta = -e.deltaY * 0.0015;
    const next = Math.max(0, Math.min(1, prev + delta));
    this.canvas.dataset.thrust = String(next);
    this.thrust(next);
  };

  private applyFacingFromPointer(e: PointerEvent) {
    const pos = this.getWitnessPos?.();
    if (!pos) return;

    const px = e.clientX - this.rect.left;
    const py = e.clientY - this.rect.top;

    const dpr = devicePixelRatio || 1;
    const wx = pos.x / dpr;
    const wy = pos.y / dpr;

    const dx = px - wx;
    const dy = py - wy;
    const mag = Math.hypot(dx, dy) || 1;
    this.setFacing(dx / mag, dy / mag);
  }

  private applyPressureThrust(e: PointerEvent) {
    // Some devices report pressure in [0..1]; treat >0 as thrust
    if (typeof e.pressure === "number" && e.pressure > 0) {
      const amt = Math.max(0, Math.min(1, e.pressure));
      this.canvas.dataset.thrust = String(amt);
      this.thrust(amt);
    }
  }

  private burstThrust() {
    // quick helper: a short auto-thrust burst
    const amt = 0.6;
    this.canvas.dataset.thrust = String(amt);
    this.thrust(amt);
    // decay back a little after 1.2s (optional)
    window.setTimeout(() => {
      const fallback = 0.25;
      this.canvas.dataset.thrust = String(fallback);
      this.thrust(fallback);
    }, 1200);
  }

  private cancelPressTimer() {
    if (this.pressTimer != null) {
      window.clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }
}
