import { LexiconChamber } from "@chambers/lexicon/LexiconChamber";

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
  } | null = null;
  private rootEl: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.style.display = "block";
    this.style.position = "relative";
    this.style.width = "100%";
    this.style.height = "100vh";
    this.mount();
    this.rootEl = this.closest("engine-root");
    this.rootEl?.addEventListener(
      "engine-tick",
      this.onRootTick as EventListener
    );
  }

  disconnectedCallback() {
    this.rootEl?.removeEventListener(
      "engine-tick",
      this.onRootTick as EventListener
    );
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
        :host { contain: strict; }
        .stack { position:relative; width:100%; height:100%; }
        canvas { position:absolute; inset:0; width:100%; height:100%; display:block; touch-action:none; }
      </style>
      <div class="stack">
        <canvas id="sky"></canvas>
        <canvas id="ui"></canvas>
      </div>
    `;
    const sky = this.shadowRoot!.getElementById("sky") as HTMLCanvasElement;
    const ui = this.shadowRoot!.getElementById("ui") as HTMLCanvasElement;

    // Mount the requested chamber
    if (this.chamberId === "lexicon") {
      console.log("Lexicon chamber");
      this.chamber?.dispose?.();
      this.chamber = new LexiconChamber(sky, ui);
    }
  }

  private onRootTick = (e: TickEvt) => {
    console.log("sae-chamber ontick");
    this.chamber?.tick(e.detail);
  };
}

customElements.define("sae-chamber", SaeChamber);
