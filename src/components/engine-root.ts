// src/app/engine-root.ts
import { EngineLoop } from "@/engine/EngineLoop";
import { EngineClock } from "@/engine/EngineClock";
import { BreathOscillator } from "@/engine/BreathOscillator";
import { BreathManual } from "@/engine/BreathManual";
import type { EngineTick, BreathPhase } from "@/types/Core";

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
    // ensure child chamber upgrades before we start (optional, nice to have)
    customElements.whenDefined("sae-card-chamber").then(() => customElements.upgrade?.(this));

    // manual breath bindings
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
      clock: { day01: this.clock.day01, phase: this.clock.phase },
      breath: { value, phase, isExhaling, bpm },
    };

    // bubble to subtree
    this.dispatchEvent(new CustomEvent<EngineTick>("engine-tick", { detail, bubbles: true, composed: true }));

    // optional direct hook for slotted children
    const slot = this.shadowRoot!.querySelector("slot") as HTMLSlotElement;
    for (const el of slot?.assignedElements?.() ?? []) {
      const anyEl = el as any;
      if (typeof anyEl.onBreathTick === "function") anyEl.onBreathTick(detail);
    }
  }
}

if (!customElements.get("engine-root")) customElements.define("engine-root", EngineRoot);
declare global { interface HTMLElementTagNameMap { "engine-root": EngineRoot; } }
