// src/app/engine-root.ts
// Slot-based host. Emits `engine-tick` with breath + clock each frame.
// No registry. You place <sae-card-chamber> inside <engine-root> in index.html.

type BreathPhase = "inhale" | "pause" | "exhale";

type TickDetail = {
  time: number;            // absolute seconds since page load
  dt: number;              // seconds since last frame
  clock: { day01: number; phase: "night" | "dawn" | "day" | "dusk" }; // simple clock
  breath: { value: number; phase: BreathPhase; isExhaling?: boolean; bpm: number };
  gaze?: { vx: number; vy: number }; // reserved
};

// ------------ tiny engine utilities (no legacy deps) -------------------------

class EngineLoop {
  private raf: number | null = null;
  private last = 0;
  constructor(private onFrame: (tMs: number, dtSec: number) => void) {}
  start() {
    if (this.raf != null) return;
    const tick = (t: number) => {
      const dt = this.last ? (t - this.last) / 1000 : 0;
      this.last = t;
      this.onFrame(t, dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { if (this.raf != null) cancelAnimationFrame(this.raf); this.raf = null; this.last = 0; }
}

class EngineClock {
  public day01 = 0; // 0..1 over a 2-minute "day"
  public phase: "night" | "dawn" | "day" | "dusk" = "night";
  private periodSec = 120;
  tick(dt: number) {
    this.day01 = (this.day01 + dt / this.periodSec) % 1;
    const x = this.day01;
    this.phase = x < 0.2 ? "night" : x < 0.3 ? "dawn" : x < 0.8 ? "day" : "dusk";
  }
}

// Breath backends (self-contained)
class BreathOscillator {
  public bpm: number;
  public value: number = 0;         // -1..+1 (exhale..inhale)
  public phase: BreathPhase = "pause";
  constructor(bpm = 6) { this.bpm = Math.max(2, bpm); }
  tick(dt: number, tAbs: number) {
    const period = 60 / this.bpm;
    const x = (tAbs % period) / period; // 0..1
    // inhale ~45%, pause ~10%, exhale ~45% (matches your previous layout)
    if (x < 0.45) {
      this.phase = "inhale";
      this.value = -1 + (x / 0.45) * 2; // -1→+1
    } else if (x < 0.55) {
      this.phase = "pause";
      this.value = 0; // stillness
    } else {
      this.phase = "exhale";
      const y = (x - 0.55) / 0.45; // 0..1
      this.value = +1 - y * 2;     // +1→-1
    }
  }
}

class BreathManual {
  // Simple “press to exhale, release to inhale”. Eases toward target.
  public value = 0;
  public isExhaling = false;
  public phase: BreathPhase = "pause";
  press() { this.isExhaling = true; }
  release() { this.isExhaling = false; }
  tick(dt: number) {
    const target = this.isExhaling ? -1 : +1;
    const k = 6; // approach speed
    this.value += (target - this.value) * (1 - Math.exp(-k * dt));
    const a = Math.abs(this.value);
    if (a < 0.05) this.phase = "pause";
    else this.phase = this.value > 0 ? "inhale" : "exhale";
  }
}

// ------------------------- EngineRoot element --------------------------------

export class EngineRoot extends HTMLElement {
  static get observedAttributes() { return ["breath-mode", "breath-bpm"]; }

  private loop = new EngineLoop((t, dt) => this.onTick(t, dt));
  private clock = new EngineClock();

  private auto = new BreathOscillator(6);
  private manual = new BreathManual();
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
    // Ensure chamber is defined before we start (so slotted element upgrades cleanly)
    Promise.all([customElements.whenDefined("sae-card-chamber")]).then(() => {
      customElements.upgrade?.(this);
    });

    // Manual breath pointer bindings
    const onDown = (e: PointerEvent) => {
      if (this.breathMode === "manual") { this.manual.press(); this.setPointerCapture?.(e.pointerId); }
    };
    const onUp = (e: PointerEvent) => {
      if (this.breathMode === "manual") { this.manual.release(); this.releasePointerCapture?.(e.pointerId); }
    };
    this.addEventListener("pointerdown", onDown, { passive: false });
    this.addEventListener("pointerup", onUp, { passive: false });
    this.addEventListener("pointercancel", onUp, { passive: false });

    this.loop.start();
  }

  disconnectedCallback() { this.loop.stop(); }

  private onTick(tMs: number, dt: number) {
    this.tAbsSec = tMs / 1000;
    this.clock.tick(dt);

    // step breath (auto or manual)
    let bVal: number, phase: BreathPhase, isExhaling: boolean | undefined, bpm: number;
    if (this.breathMode === "auto") {
      this.auto.tick(dt, this.tAbsSec);
      bVal = this.auto.value;
      phase = this.auto.phase;
      bpm = this.auto.bpm;
    } else {
      this.manual.tick(dt);
      bVal = this.manual.value;
      phase = this.manual.phase;
      isExhaling = this.manual.isExhaling;
      bpm = 0; // not meaningful in manual; feel free to mirror last bpm if desired
    }

    const detail: TickDetail = {
      time: this.tAbsSec,
      dt,
      clock: { day01: this.clock.day01, phase: this.clock.phase },
      breath: { value: bVal, phase, isExhaling, bpm },
    };

    // Bubble to children
    this.dispatchEvent(new CustomEvent<TickDetail>("engine-tick", {
      detail, bubbles: true, composed: true
    }));

    // Optional direct hook: if a child exposes onBreathTick(detail)
    const slot = this.shadowRoot!.querySelector("slot") as HTMLSlotElement;
    const nodes = slot?.assignedElements?.() ?? [];
    for (const el of nodes) {
      const anyEl = el as any;
      if (typeof anyEl.onBreathTick === "function") {
        anyEl.onBreathTick(detail);
      }
    }
  }
}

if (!customElements.get("engine-root")) {
  customElements.define("engine-root", EngineRoot);
}
declare global {
  interface HTMLElementTagNameMap { "engine-root": EngineRoot; }
}
