import { LexiconChamber } from "@chambers/lexicon/LexiconChamber";
import { resizeCanvasToDisplaySize } from "@/utils/canvas";
import { DebugHUD } from "@/dev/DebugHUD";

type TickEvt = CustomEvent<{
  time: number;
  dt: number;
  clock: { day01: number; phase: string };
  breath: { value: number; isExhaling: boolean };
  gaze: { vx: number; vy: number };
}>;

export class SaeChamber extends HTMLElement {
  static get observedAttributes() {
    return ["chamber"];
  }
  private chamberId = "lexicon";
  private chamber: {
    tick: (detail: TickEvt["detail"]) => void;
    dispose?: () => void;
    resize?: () => void;
    getDebugSnapshot?: () => {
      phase: string;
      activeGestalts: string[];
      effects: Record<string, unknown>;
    };
  } | null = null;

  private rootEl: HTMLElement | null = null;
  private resizeObs: ResizeObserver | null = null;
  private skyCanvas: HTMLCanvasElement | null = null;
  private uiCanvas: HTMLCanvasElement | null = null;

  // 🔎 HUD bits
  private hud = new DebugHUD();
  private hudVisible = false;
  private hudHit?: HTMLButtonElement;
  private pressTimer: number | null = null;

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
    this.rootEl?.addEventListener(
      "engine-tick",
      this.onRootTick as EventListener
    );

    // Desktop key toggle
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback() {
    this.rootEl?.removeEventListener(
      "engine-tick",
      this.onRootTick as EventListener
    );
    window.removeEventListener("keydown", this.onKey);
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    this.hud.destroy();
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
       outline: 2px solid magenta; 
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

    this.skyCanvas = this.shadowRoot!.getElementById(
      "sky"
    ) as HTMLCanvasElement;
    this.uiCanvas = this.shadowRoot!.getElementById("ui") as HTMLCanvasElement;

    // Mount the requested chamber
    if (this.chamberId === "lexicon") {
      this.chamber?.dispose?.();
      this.chamber = new LexiconChamber(this.skyCanvas, this.uiCanvas);
    }

    // Attach HUD to shadow root, start hidden
    this.hud.attach(this.shadowRoot!);
    this.hud.setVisible(this.hudVisible);

    // HUD hotspot listeners (long-press ~500ms)
    this.hudHit = this.shadowRoot!.getElementById(
      "hud-hit"
    ) as HTMLButtonElement;
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.pressTimer !== null) return;
      this.pressTimer = window.setTimeout(() => {
        this.pressTimer = null;
        this.hudVisible = !this.hudVisible;
        this.hud.setVisible(this.hudVisible);
      }, 500);
    };
    const clearPress = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.pressTimer !== null) {
        clearTimeout(this.pressTimer);
        this.pressTimer = null;
      }
    };
    this.hudHit.addEventListener("pointerdown", onDown, { passive: false });
    this.hudHit.addEventListener("pointerup", clearPress, { passive: false });
    this.hudHit.addEventListener("pointercancel", clearPress, {
      passive: false,
    });
    this.hudHit.addEventListener("pointerleave", clearPress, {
      passive: false,
    });

    // (Re)start host resize observation
    this.resizeObs?.disconnect();
    this.resizeObs = new ResizeObserver(() => this.onHostResize());
    this.resizeObs.observe(this);

    // Initial resize + first draw
    this.onHostResize();
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === "h") {
      this.hudVisible = !this.hudVisible;
      this.hud.setVisible(this.hudVisible);
    }
  };

  private onRootTick = (e: TickEvt) => {
    const detail = e.detail;
    this.chamber?.tick(detail);

    // 🔎 Update HUD (if visible)
    if (this.hudVisible) {
      const size = {
        w: this.uiCanvas?.clientWidth ?? 0,
        h: this.uiCanvas?.clientHeight ?? 0,
      };
      const snap = this.chamber?.getDebugSnapshot?.() ?? {
        phase: detail.clock.phase,
        activeGestalts: [],
        effects: {},
      };
      this.hud.update({
        ...detail,
        size,
        dpr: devicePixelRatio || 1,
        mode: undefined, // plug in your ModeController later
        activeGestalts: snap.activeGestalts,
        effects: snap.effects,
      });
    }
  };

  private sizeRetryRAF: number | null = null;

  private onHostResize() {
    const measure = () => {
      let rect = this.getBoundingClientRect();
      // Fallback to viewport if rect hasn't resolved yet
      if (rect.width < 2 || rect.height < 2) {
        rect = {
          width: window.innerWidth,
          height: window.innerHeight,
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          toJSON: () => {},
        } as any;
      }
      const dpr = Math.min(devicePixelRatio || 1, 2);

      const sizeCanvas = (c: HTMLCanvasElement | null) => {
        if (!c) return;
        c.style.width = "100%";
        c.style.height = "100%";
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        if (c.width !== w) c.width = w;
        if (c.height !== h) c.height = h;
        const ctx = c.getContext("2d");
        if (ctx && "setTransform" in ctx) {
          const g = ctx as CanvasRenderingContext2D;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.scale(dpr, dpr); // draw in CSS pixels
        }
      };

      sizeCanvas(this.skyCanvas);
      sizeCanvas(this.uiCanvas);

      // draw one frame immediately
      this.chamber?.resize?.();
      this.chamber?.tick({
        time: performance.now(),
        dt: 0,
        clock: { day01: 0, phase: "day" },
        breath: { value: 0, isExhaling: false },
        gaze: { vx: 1, vy: 0 },
      });
    };

    // Try now…
    measure();
    // …and schedule one more pass next frame to catch late layout
    if (this.sizeRetryRAF !== null) cancelAnimationFrame(this.sizeRetryRAF);
    this.sizeRetryRAF = requestAnimationFrame(() => {
      this.sizeRetryRAF = null;
      measure();
    });
  }
}

customElements.define("sae-chamber", SaeChamber);
