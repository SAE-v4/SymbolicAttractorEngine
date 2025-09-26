// src/app/engine-root.ts
import { EngineLoop } from "@/engine/EngineLoop";
import { EngineClock } from "@/engine/EngineClock";
import { BreathOscillator } from "@/engine/BreathOscillator";
import { BreathManual } from "@/engine/BreathManual";
import type { EngineTick, BreathPhase } from "@/types/Core";

export class EngineRoot extends HTMLElement {
  // New: allow setting the virtual day period (seconds), and breath mode/bpm
  static get observedAttributes() { return ["breath-mode", "breath-bpm", "day-period"]; }

  private loop = new EngineLoop((t, dt) => this.onTick(t, dt));
  private clock = new EngineClock(); // default 120s; can be overridden via attribute

  private auto = new BreathOscillator(6);
  private manual = new BreathManual();
  private breathMode: "auto" | "manual" = "auto";

  private tAbsSec = 0;
  private slotEl!: HTMLSlotElement;

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
    this.slotEl = shadow.querySelector("slot") as HTMLSlotElement;
  }

  attributeChangedCallback(name: string, _o: string|null, v: string|null) {
    if (name === "breath-mode" && v) this.breathMode = (v === "manual" ? "manual" : "auto");
    if (name === "breath-bpm"  && v) this.auto.bpm = Math.max(2, Number(v) || 6);
    if (name === "day-period"  && v) {
      const sec = Math.max(10, Number(v) || 120);
      // re-create clock with new period (keeps code simple)
      const old = this.clock;
      this.clock = new EngineClock(sec);
      // forward onPhaseChange hook
      this.clock.onPhaseChange = old.onPhaseChange;
    }
  }

  connectedCallback() {
    // Phase change → bubble an event any chamber can listen to
    this.clock.onPhaseChange = (phase) => {
      this.dispatchEvent(new CustomEvent("day-phase", {
        detail: { phase },
        bubbles: true,
        composed: true
      }));
    };

    // Manual breath bindings
    const onDown = (e: PointerEvent) => { if (this.breathMode === "manual") { this.manual.press(); this.setPointerCapture?.(e.pointerId); } };
    const onUp   = (e: PointerEvent) => { if (this.breathMode === "manual") { this.manual.release(); this.releasePointerCapture?.(e.pointerId); } };
    this.addEventListener("pointerdown", onDown, { passive:false });
    this.addEventListener("pointerup", onUp, { passive:false });
    this.addEventListener("pointercancel", onUp, { passive:false });

    this.loop.start();
  }

  disconnectedCallback() { this.loop.stop(); }

  private onTick(tMs: number, dt: number) {
    this.tAbsSec = tMs / 1000;
    this.clock.tick(dt);

    let value: number, phase: BreathPhase, isExhaling: boolean | undefined, bpm: number;
    if (this.breathMode === "auto") {
      this.auto.tick(dt, this.tAbsSec);
      value = this.auto.value; phase = this.auto.phase; bpm = this.auto.bpm;
    } else {
      this.manual.tick(dt);
      value = this.manual.value; phase = this.manual.phase; isExhaling = this.manual.isExhaling; bpm = 0;
    }

const detail: EngineTick = {
  time: this.tAbsSec,
  dt,
  clock: {
    day01: this.clock.day01,
    phase: this.clock.phase,
    axisIndex: this.clock.axisIndex,   // NEW
    week01: this.clock.week01          // optional
  },
  breath: { value, phase, isExhaling, bpm },
};

    // Broadcast to subtree
    this.dispatchEvent(new CustomEvent<EngineTick>("engine-tick", { detail, bubbles: true, composed: true }));

    // Direct push to slotted children (flexible method names)
    const els = this.slotEl?.assignedElements?.() ?? [];
    for (const el of els) {
      const anyEl = el as any;
      if (typeof anyEl.update === "function") {
        anyEl.update(detail);                    // preferred (PoolChamberEl supports this)
      } else {
        anyEl.setClock?.(detail.clock.day01, detail.clock.phase);
        anyEl.setBreath?.(detail.breath);
        anyEl.render?.(detail.dt);
        // Back-compat hook name if some components used this
        anyEl.onBreathTick?.(detail);
      }
    }
  }
}

if (!customElements.get("engine-root")) customElements.define("engine-root", EngineRoot);
declare global { interface HTMLElementTagNameMap { "engine-root": EngineRoot; } }
