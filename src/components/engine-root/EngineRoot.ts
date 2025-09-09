import { EngineLoop } from "@/runtime/EngineLoop";
import { EngineClock } from "@/runtime/EngineClock";
import { BreathRuntime } from "@/runtime/BreathRuntime";
import { BreathOscillator, BreathPhase } from "@/runtime/BreathOscillator";

type TickDetail = {
  time: number;
  dt: number;
  clock: { day01: number; phase: import("@/runtime/EngineClock").DayPhase };
  breath: { value: number; phase: BreathPhase; isExhaling?: boolean };
  gaze?: { vx: number; vy: number };
};

export class EngineRoot extends HTMLElement {
  static get observedAttributes() { return ["breath-mode", "breath-bpm"]; }

  private loop = new EngineLoop((t, dt) => this.onTick(t, dt));
  private clock = new EngineClock();
  // two breath backends; we’ll pick one
  private manual = new BreathRuntime();
  private auto = new BreathOscillator(6, 0.12);

  private breathMode: "auto" | "manual" = "auto";
  private tAbsSec = 0;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { display:block; position:relative; width:100%; height:100dvh; min-height:100vh; background:#070a0f; }
        .frame { position:relative; width:100%; height:100%; }
        .slot-wrap { position:absolute; inset:0; }
        ::slotted(*) { display:block; width:100%; height:100%; }
      </style>
      <div class="frame"><div class="slot-wrap"><slot></slot></div></div>
    `;
  }

  attributeChangedCallback(name: string, _o: string|null, v: string|null) {
    if (name === "breath-mode" && v) this.breathMode = (v === "manual" ? "manual" : "auto");
    if (name === "breath-bpm" && v)  this.auto.bpm = Math.max(2, Number(v) || 6);
  }

  connectedCallback() {
    // optional: ensure key children are defined before starting
    Promise.all([customElements.whenDefined("sae-chamber")]).then(() => {
      customElements.upgrade?.(this);
    });

    // pointer drives manual breath only when in manual mode
    const onDown = (e: PointerEvent) => { if (this.breathMode === "manual") { this.manual.press(); this.setPointerCapture(e.pointerId); } };
    const onUp   = (e: PointerEvent) => { if (this.breathMode === "manual") { this.manual.release(); this.releasePointerCapture(e.pointerId); } };
    this.addEventListener("pointerdown", onDown, { passive:false });
    this.addEventListener("pointerup", onUp, { passive:false });
    this.addEventListener("pointercancel", onUp, { passive:false });

    this.loop.start();
  }

  disconnectedCallback() { this.loop.stop(); }

  private onTick(tMs: number, dt: number) {
    this.tAbsSec = tMs / 1000;
    this.clock.tick(dt);

    // step breath (auto or manual)
    let breathValue: number;
    let phase: BreathPhase;
    let isExhaling: boolean | undefined;

    if (this.breathMode === "auto") {
      this.auto.tick(dt, this.tAbsSec);
      breathValue = this.auto.value;       // -1..+1
      phase = this.auto.phase;
    } else {
      // manual value 0..1 → remap to -1..+1 around 0.5
      this.manual.tick(dt);
      breathValue = (this.manual.value - 0.5) * 2; // ~-0.84..+1.0 due to floor; fine for now
      phase = this.manual.isExhaling ? "exhale" : "inhale";
      isExhaling = this.manual.isExhaling;
      if (Math.abs(breathValue) < 0.05) phase = "pause";
    }

    const detail: TickDetail = {
      time: this.tAbsSec,
      dt,
      clock: { day01: this.clock.day01, phase: this.clock.phase },
      breath: { value: breathValue, phase, isExhaling },
    };

    this.dispatchEvent(new CustomEvent<TickDetail>("engine-tick", {
      detail, bubbles: true, composed: true
    }));
  }
}

if (!customElements.get("engine-root")) {
  customElements.define("engine-root", EngineRoot);
}
