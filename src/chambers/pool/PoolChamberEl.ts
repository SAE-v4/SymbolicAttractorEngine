// src/chambers/pool/PoolChamberEl.ts
import type { DayPhase } from "@/types";
import type { BreathSample, EngineTick, Lens, PoolKind } from "@/types";

import { PhaseGlimmer } from "@chambers/pool/systems/PhaseGlimmer";
import { PoolSeeds } from "@chambers/pool/systems/PoolSeeds";
import { BandLayer } from "@chambers/pool/layers/BandLayer";
import { EchoLayer } from "@chambers/pool/layers/EchoLayer";
import { TextLayer } from "@chambers/pool/layers/TextLayer";
import { macroHue } from "@chambers/pool/systems/macroHue";
import { LensDirector } from "@chambers/pool/systems/LensDirector";
import { DebugHud } from "@chambers/pool/systems/DebugHud";

// NEW: theme key is owned by BandLayer via setTheme("normal"|"test"|"vibrant")
type ThemeKey = "normal" | "test" | "vibrant";

export class PoolChamberEl extends HTMLElement {
  static get observedAttributes() { return ["debug", "theme", "lock-lens", "channel"]; }

  // Debug + tuning
  private hud = new DebugHud();
  private debug = false;
  private lockLens?: Lens; // force a lens during tuning
  private themeKey: ThemeKey = "normal";

  // Canvas
  private canvas!: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private dpr = Math.max(1, devicePixelRatio || 1);

  // Dynamics
  private lens: Lens = "witness";
  private lensDir = new LensDirector(8, 2); // 8s fade, 2s hysteresis
  private glimmer = new PhaseGlimmer();
  private poolSeeds = new PoolSeeds(() => this.dispatchEvent.bind(this));

  // Layers
  private bands = new BandLayer();
  private echoes = new EchoLayer();
  private text = new TextLayer();

  // State
  private _breath: BreathSample = { value: 0, phase: "inhale", bpm: 6 };
  private _macroHue = 95;
  private _day01 = 0;
  private _dayPhase: DayPhase = "day";
  private _lastDt = 0.016;

  private ro?: ResizeObserver;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  attributeChangedCallback(name: string, _o: string | null, v: string | null) {
    if (name === "debug") this.debug = v !== null;

    if (name === "theme") {
      const k = ((v ?? "normal").toLowerCase() as ThemeKey);
      this.themeKey = (k === "test" || k === "vibrant") ? k : "normal";
      this.bands.setTheme(this.themeKey);
    }

    if (name === "lock-lens") this.lockLens = (v as Lens) || undefined;

    if (name === "channel") {
      const p = (v ?? "both").toLowerCase();
      const good = p === "shadow" || p === "light" ? p : "both";
      this.bands.setPreview(good);
    }
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host{display:block;position:relative;contain:layout paint}
        canvas{position:absolute;inset:0;width:100%;height:100%}
      </style>
      <canvas></canvas>
    `;
    this.canvas = this.shadowRoot!.querySelector("canvas")!;
    this.g = this.canvas.getContext("2d")!;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.resize();

    // init attributes
    this.attributeChangedCallback("debug", null, this.getAttribute("debug"));
    this.attributeChangedCallback("theme", null, this.getAttribute("theme"));
    this.attributeChangedCallback("lock-lens", null, this.getAttribute("lock-lens"));
    this.attributeChangedCallback("channel", null, this.getAttribute("channel"));

    // optional keyboard toggles (focusable for key events)
    this.tabIndex = 0;
    this.addEventListener("keydown", (e) => {
      if (e.key === "d") this.debug = !this.debug;
      if (e.key === "p") {
        // quick toggle normal <-> test
        this.themeKey = this.themeKey === "test" ? "normal" : "test";
        this.bands.setTheme(this.themeKey);
      }
    });
  }

  disconnectedCallback() { this.ro?.disconnect(); }

  private resize() {
    const w = Math.max(1, this.clientWidth);
    const h = Math.max(1, this.clientHeight);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.bands.resize(w, h);
    this.echoes.resize(w, h);
    this.text.resize(w, h);
  }

  // --- engine hooks ---
  setClock(day01: number, phase: DayPhase) {
    this._day01 = day01;
    this._dayPhase = phase;

    // Lens: either lock (for tuning) or smooth via LensDirector
    const effectiveLens = this.lockLens ?? this.lensDir.update(this._lastDt, phase);
    this.lens = effectiveLens;

    // Gentle meso tint from clock phase (kept for future color nudges)
    this._macroHue = macroHue(day01, phase);
  }

  setBreath(b: BreathSample) {
    this._breath = b;
    this.glimmer.update(b.phase);
  }

  /** Optional convenience for whole EngineTick */
  update(tick: EngineTick) {
    this._lastDt = tick.dt || 0.016;
    this.setClock(tick.clock.day01, tick.clock.phase as DayPhase);
    this.setBreath(tick.breath);
    this.render(tick.dt);
  }

  // --- gesture hook ---
  onTraceEnd(result: { kind: PoolKind; dir?: "cw" | "ccw"; confidence: number; centroid: { x: number; y: number }; }) {
    this.echoes.spawn(result, this._breath, this.lens);
    const seed = this.poolSeeds.build(result, this.lens, this._day01);
    this.dispatchEvent(new CustomEvent("pool:seed", { detail: seed, bubbles: true }));
  }

  disturb(kind: PoolKind, x: number, y: number, strength = 1, dir?: "cw" | "ccw") {
    this.bands.disturb(kind, x, y, strength, dir);
  }

  render(dt: number) {
    this._lastDt = dt || this._lastDt;
    const intensity = this.glimmer.advance(dt);

    const g = this.g;
    g.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    // Bands (horizons), Echoes, Text
    this.bands.draw(
      g,
      this.lens,
      this._breath,
      intensity,
      this._macroHue,
      this._lastDt,
      this._day01,         // <-- pass day01
      this._dayPhase       // <-- pass dayPhase
    );

    this.echoes.draw(g, this._breath);
    this.text.draw(g, this._breath);

    // Debug HUD
    if (this.debug) {
      const m = this.bands.getMetrics();
      const fps = this.hud.updateFps();
      this.hud.draw(g, {
        fps,
        day01: this._day01,
        dayPhase: this._dayPhase,      // optional label if your HUD shows it
        phase: this._breath.phase,
        value: this._breath.value,
        glimmer: intensity,
        lens: this.lens,
        spacing: m.spacing,
        thick: m.thick,
        lead: m.lead,
        lag: m.lag,
        alphaShadow: m.alphaShadow,
        alphaLight: m.alphaLight,
      });
    }
  }
}

if (!customElements.get("sae-pool-chamber")) {
  customElements.define("sae-pool-chamber", PoolChamberEl);
}
declare global { interface HTMLElementTagNameMap { "sae-pool-chamber": PoolChamberEl; } }
