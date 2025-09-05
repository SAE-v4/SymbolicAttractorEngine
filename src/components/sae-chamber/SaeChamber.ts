import { LexiconChamber } from "@chambers/lexicon/LexiconChamber";
import { resizeCanvasToDisplaySize } from "@/utils/canvas";

type TickEvt = CustomEvent<{
  time: number;
  dt: number;
  clock: { day01: number; phase: string };
  breath: { value: number; isExhaling: boolean };
  gaze: { vx: number; vy: number };
}>;

export class SaeChamber extends HTMLElement {
  static get observedAttributes() { return ["chamber"]; }
  private chamberId = "lexicon";
  private chamber: {
    tick: (detail: TickEvt["detail"]) => void;
    dispose?: () => void;
    // Optional: if your chamber exposes a resize(), we’ll call it.
    resize?: () => void;
  } | null = null;

  private rootEl: HTMLElement | null = null;
  private resizeObs: ResizeObserver | null = null;

  // Keep refs so the observer can resize them
  private skyCanvas: HTMLCanvasElement | null = null;
  private uiCanvas: HTMLCanvasElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.position = "relative";
    this.style.width = "100%";
    this.mount();

    this.rootEl = this.closest("engine-root");
    this.rootEl?.addEventListener("engine-tick", this.onRootTick as EventListener);

    // Desktop key toggle
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    this.rootEl?.removeEventListener(
      "engine-tick",
      this.onRootTick as EventListener
    );
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    this.chamber?.dispose?.();
    this.chamber = null;
  }

  attributeChangedCallback(name: string, _o: string, n: string) {
    if (name === "chamber" && n && n !== this.chamberId) {
      this.chamberId = n;
      this.mount();
    }
  }

  private mount() {
    this.shadowRoot!.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      width: 100%;
      /* pick ONE of these depending on how you size <engine-root> */
      height: 100%;        /* if <engine-root> has a concrete height */
      /* height: 100dvh;   // or make the chamber self-sized to viewport */
      /* min-height: 100vh; */
      contain: layout paint;
    }
    .stack { position: relative; width: 100%; height: 100%; }
    canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
    /* 🔎 HUD hotspot (top-right long-press) */
    #hud-hit {
      position: absolute; top: 0; right: 0; width: 56px; height: 56px;
      background: transparent; border: 0; padding: 0; margin: 0;
      touch-action: none; cursor: default; z-index: 20;
    }
  </style>
  <div class="stack">
    <canvas id="sky"></canvas>
    <canvas id="ui"></canvas>
    <button id="hud-hit" aria-label="Toggle HUD"></button>
  </div>
`;

    this.skyCanvas = this.shadowRoot!.getElementById("sky") as HTMLCanvasElement;
    this.uiCanvas  = this.shadowRoot!.getElementById("ui")  as HTMLCanvasElement;

    // Mount the requested chamber
    if (this.chamberId === "lexicon") {
      this.chamber?.dispose?.();
      this.chamber = new LexiconChamber(this.skyCanvas, this.uiCanvas);
    }

    // (Re)start host resize observation
    this.resizeObs?.disconnect();
    this.resizeObs = new ResizeObserver(() => this.onHostResize());
    this.resizeObs.observe(this);

    // Do an initial resize + tick so we draw immediately
    this.onHostResize();
  }

  private onRootTick = (e: TickEvt) => {
    this.chamber?.tick(e.detail);
  };

  private onHostResize() {
    if (this.skyCanvas) resizeCanvasToDisplaySize(this.skyCanvas);
    if (this.uiCanvas)  resizeCanvasToDisplaySize(this.uiCanvas);

    // If the chamber exposes a resize hook, call it; otherwise kick a safe tick to redraw.
    this.chamber?.resize?.();
    this.chamber?.tick({
      time: performance.now(),
      dt: 0,
      clock: { day01: 0, phase: "day" },
      breath: { value: 0, isExhaling: false },
      gaze: { vx: 1, vy: 0 }
    });
  }
}

customElements.define("sae-chamber", SaeChamber);
