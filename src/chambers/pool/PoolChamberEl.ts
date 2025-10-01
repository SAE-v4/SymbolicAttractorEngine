import type { DayPhase } from "@/types";
import type { BreathSample, EngineTick, PoolKind } from "@/types";
import { BandLayer } from "@chambers/pool/layers/BandLayer";
import type { LensKey } from "@systems/bands/BandTypes";


export class PoolChamberEl extends HTMLElement {
  static get observedAttributes() { return ["debug", "lens"]; }

  private dpr = Math.max(1, devicePixelRatio || 1);
  private bands = new BandLayer();

  private _breath: BreathSample = { value: 0, phase: "inhale", bpm: 6 };
  private _day01 = 0;
  private _dayPhase: DayPhase = "day";
  private _lastDt = 0.016;

  private ro?: ResizeObserver;
  private useSyntheticBreath = false;

  // NEW: HUD elements/state
  private debug = false;
  private hudEl!: HTMLDivElement;

  private lensLock?: LensKey;      // when set, disables auto routing
  private prevPhase: BreathSample["phase"] = "inhale";
  private lensFadeSec = 0.8;
  private phaseToLens: Record<BreathSample["phase"], LensKey> = {
    inhale: "observatory",
    exhale: "observatory",
    pause: "witness",
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  attributeChangedCallback(name: string, _o: string | null, v: string | null) {
    if (name === "debug") {
      this.debug = v !== null;
      if (this.hudEl) this.hudEl.style.display = this.debug ? "block" : "none";
    }
    if (name === "lens-lock") {
      this.lensLock = (v as LensKey) || undefined;
      if (this.lensLock) this.bands.setLens(this.lensLock, this.lensFadeSec);
    }
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host{display:block;position:relative;contain:layout paint}
        .hud{
          position:absolute; top:8px; left:8px; z-index:10;
          background:rgba(0,0,0,0.55); color:#fff;
          font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
          line-height:1.35; padding:8px 10px; border-radius:8px;
          white-space:pre; user-select:text; pointer-events:auto;
        }
        .hud b{ color:#a5e3ff; font-weight:600 }
        .hud .dim{ color:#cbd5e1 }
      </style>
    `;

    // Mount GL overlay
    this.bands.mount(this.shadowRoot!);

    // NEW: HUD element
    this.hudEl = document.createElement("div");
    this.hudEl.className = "hud";
    this.hudEl.style.display = this.debug ? "block" : "none";
    this.shadowRoot!.appendChild(this.hudEl);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.resize();

    // initialize debug attribute if present
    this.attributeChangedCallback("debug", null, this.getAttribute("debug"));
    this.attributeChangedCallback("lens-lock", null, this.getAttribute("lens-lock"));

    // Set an initial lens (lock wins; else route by current phase)
    const initialLens = this.lensLock ?? this.phaseToLens[this._breath.phase];
    this.bands.setLens(initialLens, 0.0); // no fade at boot
  }

  disconnectedCallback() { this.ro?.disconnect(); }

  private resize() {
    const w = Math.max(1, this.clientWidth);
    const h = Math.max(1, this.clientHeight);
    this.bands.resize(w, h, this.dpr);
  }

  // --- engine hooks ---
  setClock(day01: number, phase: DayPhase) {
    this._day01 = day01;
    this._dayPhase = phase;
  }

 setBreath(b: BreathSample) {
    // Phase edge detection
    if (b.phase !== this._breath.phase) {
      this.prevPhase = this._breath.phase;
      // Auto lens routing unless locked
      if (!this.lensLock) {
        const nextLens = this.phaseToLens[b.phase];
        this.bands.setLens(nextLens, this.lensFadeSec);
      }
    }
    this._breath = b;
  }


  update(tick: EngineTick) {
    this._lastDt = tick.dt || 0.016;
    this.setClock(tick.clock.day01, tick.clock.phase as DayPhase);
    this.setBreath(tick.breath);
    this.render(this._lastDt);
  }

  // OPTIONAL: synthetic breath for validation
  private synthBreath(_dt: number) {
    const period = 3.5;
    const t = (performance.now() / 1000) % (period * 3);
    let phase: BreathSample["phase"] = "inhale";
    let value = 0;
    if (t < period) { phase = "inhale"; value = t / period; }
    else if (t < 2 * period) { phase = "pause"; value = 0.5; }
    else { phase = "exhale"; value = (t - 2 * period) / period; }
    this._breath = { value, phase, bpm: 60 / (period * 2) };
  }

  render(dt: number) {
    if (this.useSyntheticBreath) this.synthBreath(dt);

    this.bands.setBreath(this._breath);
    this.bands.update(dt);
    this.bands.draw();

    if (this.debug) this.updateHUD();
  }

  // NEW: HUD update
  private updateHUD() {
    const d = this.bands.getDebug();
    const lines = [
      `phase:  \t${d.phase}`,
     `lens:    \t${(d as any).lens ?? "?"}  blendT=${(d as any).blendT?.toFixed?.(2) ?? "-"}`,
      `p_int:  \t${d.phase === "pause" ? "-" : d.pInt.toFixed(3)}`,
      `speed:  \t${d.speed.toFixed(3)} h/s`,
      `scroll: \t${d.scroll.toFixed(3)} (period=${d.period.toFixed(3)})`,
      `bpm:    \t${d.bpm.toFixed(2)}`,
      `freq:   \t${d.freq.toFixed(2)}  tilt: ${d.tilt.toFixed(3)}`,
      `day01:  \t${this._day01.toFixed(3)} (${this._dayPhase})`,
    ];
    this.hudEl.textContent = lines.join("\n");
  }

  // compatibility stub
  disturb(_kind: PoolKind, _x: number, _y: number, _strength = 1, _dir?: "cw" | "ccw") { }
}

if (!customElements.get("sae-pool-chamber")) {
  customElements.define("sae-pool-chamber", PoolChamberEl);
}
declare global { interface HTMLElementTagNameMap { "sae-pool-chamber": PoolChamberEl; } }
