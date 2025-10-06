import type { DayPhase } from "@/types";
import type { BreathSample, EngineTick, PoolKind } from "@/types";
import { BandLayer } from "@chambers/pool/layers/BandLayer";
import type { LensKey } from "@systems/bands/BandTypes";

export class PoolChamberEl extends HTMLElement {
  // Observe all attributes we handle
  static get observedAttributes() { return ["debug", "lens", "lens-lock"]; }

  private dpr = Math.max(1, devicePixelRatio || 1);

  // GL bands layer
  private bands = new BandLayer();

  // Engine state
  private _breath: BreathSample = { value: 0, phase: "inhale", bpm: 6 };
  private _day01 = 0;
  private _dayPhase: DayPhase = "day";
  private _lastDt = 0.016;

  private ro?: ResizeObserver;

  // Debug & HUD
  private debug = false;
  private hudEl!: HTMLDivElement;

  // Lens routing
  private lensLock?: LensKey;           // when set, disables auto routing
  private prevPhase: BreathSample["phase"] = "inhale";
  private lensFadeSec = 0.8;

  // Safer default: keep Pause in Observatory; set to true to route Pause→Witness automatically
  private routePauseToWitness = false;

  // Derived map (rebuilt on flag change if needed)
  private get phaseToLens(): Record<BreathSample["phase"], LensKey> {
    return {
      inhale: "observatory",
      exhale: "observatory",
      pause: this.routePauseToWitness ? "witness" : "observatory",
    };
  }

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
      if (this.lensLock) {
        // Immediate handover to locked lens
        this.bands.setLens(this.lensLock, this.lensFadeSec);
      }
    }

    // Manual non-locking override. If lens-lock is set, this is ignored.
    if (name === "lens" && !this.lensLock && v) {
      this.bands.setLens(v as LensKey, this.lensFadeSec);
    }
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host { display:block; position:relative; contain:layout paint; }
        .hud {
          position:absolute; top:8px; left:8px; z-index:10;
          background:rgba(0,0,0,0.55); color:#fff;
          font:12px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
          line-height:1.35; padding:8px 10px; border-radius:8px;
          white-space:pre; user-select:text; pointer-events:auto;
        }
        .hud b { color:#a5e3ff; font-weight:600; }
        .hud .dim { color:#cbd5e1; }
      </style>
    `;

    // Mount GL overlay
    this.bands.mount(this.shadowRoot!);

    // HUD
    this.hudEl = document.createElement("div");
    this.hudEl.className = "hud";
    this.hudEl.style.display = this.debug ? "block" : "none";
    this.shadowRoot!.appendChild(this.hudEl);

    // Resize
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.resize();

    // Initialize attributes (if present in markup)
    this.attributeChangedCallback("debug", null, this.getAttribute("debug"));
    this.attributeChangedCallback("lens-lock", null, this.getAttribute("lens-lock"));
    this.attributeChangedCallback("lens", null, this.getAttribute("lens"));

    // Set initial lens: lock wins; else route by current phase (no fade at boot)
    const initialLens = this.lensLock ?? this.phaseToLens[this._breath.phase];
    this.bands.setLens(initialLens, 0.0);
  }

  disconnectedCallback() {
    this.ro?.disconnect();
  }

  private resize() {
    const w = Math.max(1, this.clientWidth);
    const h = Math.max(1, this.clientHeight);
    this.bands.resize(w, h, this.dpr);
  }

  // --- engine hooks ----

  setClock(day01: number, phase: DayPhase) {
    this._day01 = day01;
    this._dayPhase = phase;
  }

  setBreath(b: BreathSample) {
    // Phase edge detection for calmer routing
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

  render(dt: number) {
    // Feed day clock + breath into bands every frame
    this.bands.setClock(this._day01, this._dayPhase);
    this.bands.setBreath(this._breath);

    // Step + draw
    this.bands.update(dt);
    this.bands.draw();

    if (this.debug) this.updateHUD();
  }

  // HUD expects specific keys; keep names consistent with BandLayer.getDebug()
  private updateHUD() {
    const d = this.bands.getDebug?.() ?? {};
    const lines = [
      `phase:  \t${(d as any).phase ?? this._breath.phase}`,
      `lens:    \t${(d as any).lens ?? "?"}  blendT=${(d as any).blendT?.toFixed?.(2) ?? "-"}`,
      `p_int:  \t${(d as any).phase === "pause" ? "-" : (d as any).pInt?.toFixed?.(3) ?? "-"}`,
      `speed:  \t${(d as any).speed?.toFixed?.(3) ?? "-" } h/s`,
      `scroll: \t${(d as any).scroll?.toFixed?.(3) ?? "-" } (period=${(d as any).period?.toFixed?.(3) ?? "-"})`,
      `bpm:    \t${(d as any).bpm?.toFixed?.(2) ?? this._breath.bpm.toFixed(2)}`,
      `freq:   \t${(d as any).freq?.toFixed?.(2) ?? "-" }  tilt: ${ (d as any).tilt?.toFixed?.(3) ?? "-" }`,
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

declare global {
  interface HTMLElementTagNameMap { "sae-pool-chamber": PoolChamberEl; }
}
