import { EngineLoop } from "@/runtime/EngineLoop";
import { EngineClock } from "@/runtime/EngineClock";
import { BreathRuntime } from "@/runtime/BreathRuntime";

type TickDetail = {
  time: number;
  dt: number;
  clock: { day01: number; phase: import("@/runtime/EngineClock").DayPhase };
  breath: { value: number; isExhaling: boolean };
  gaze: { vx: number; vy: number }; // unit vector
};

export class EngineRoot extends HTMLElement {
  private loop = new EngineLoop((t, dt) => this.onTick(t, dt));
  private clock = new EngineClock();
  private breath = new BreathRuntime();
  private vx = 1; private vy = 0; // gaze vector
  private pressId: number | null = null;

  constructor() { super(); this.attachShadow({ mode: "open" }); }

  connectedCallback() {
   // Give children a real containing block
  this.style.display = "block";
  this.style.position = "relative";
  this.style.width = "100%";
  this.style.height = "100dvh";  // iOS-safe viewport height
  (this.style as any).minHeight = "100vh";

    this.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    this.addEventListener("pointermove", this.onPointerMove, { passive: false });
    this.addEventListener("pointerup", this.onPointerUp, { passive: false });
    this.addEventListener("pointercancel", this.onPointerUp, { passive: false });
    this.loop.start();
  }

  disconnectedCallback() {
    this.loop.stop();
    this.removeEventListener("pointerdown", this.onPointerDown);
    this.removeEventListener("pointermove", this.onPointerMove);
    this.removeEventListener("pointerup", this.onPointerUp);
    this.removeEventListener("pointercancel", this.onPointerUp);
  }

  private onPointerMove = (e: PointerEvent) => {
    const hostRect = (this.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 1, height:1 });
    const cx = hostRect.left + hostRect.width / 2;
    const cy = hostRect.top  + hostRect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const mag = Math.hypot(dx, dy) || 1;
    this.vx = dx / mag;
    this.vy = dy / mag;
  };

  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    if (this.pressId !== null) return;
    this.pressId = e.pointerId;
    this.setPointerCapture(e.pointerId);
    this.breath.press();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.pressId !== e.pointerId) return;
    this.pressId = null;
    this.releasePointerCapture(e.pointerId);
    this.breath.release();
  };

  private onTick(time: number, dt: number) {
   // console.log("engine-root onTick")
    this.clock.tick(dt);
    this.breath.tick(dt);

    const detail: TickDetail = {
      time, dt,
      clock: { day01: this.clock.day01, phase: this.clock.phase },
      breath: { value: this.breath.value, isExhaling: this.breath.isExhaling },
      gaze: { vx: this.vx, vy: this.vy }
    };
    this.dispatchEvent(new CustomEvent<TickDetail>("engine-tick", { detail, bubbles: true, composed: true }));
  }
}

customElements.define("engine-root", EngineRoot);
