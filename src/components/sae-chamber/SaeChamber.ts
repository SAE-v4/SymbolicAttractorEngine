// src/components/sae-chamber/SaeChamber.ts
import { Canvas2DRenderer } from "@/renderer/Canvas2Drenderer";
import { LightShadowPrototype } from "@/views/LightShadowPrototype";

type TickEvt = CustomEvent<{ time:number; dt:number; breath:{ value:number; phase:"inhale"|"pause"|"exhale" } }>;

export class SaeChamber extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private renderer!: Canvas2DRenderer;
  private view!: LightShadowPrototype;

  // ...constructor same as before...
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { display:block; width:100%; height:100%; }
        canvas { position:absolute; inset:0; width:100%; height:100%; display:block; }
      </style>
      <canvas></canvas>
    `;
    this.canvas = shadow.querySelector("canvas")!;
    this.renderer = new Canvas2DRenderer(this.canvas);
    this.view = new LightShadowPrototype(this.renderer);
  }

  connectedCallback() {
    this.closest("engine-root")
        ?.addEventListener("engine-tick", this.onTick as EventListener);

    new ResizeObserver(() => this.resize()).observe(this);
    this.resize();
  }

  private resize() {
    const rect = this.getBoundingClientRect();
    this.renderer.resize(Math.max(1, rect.width), Math.max(1, rect.height));
  }

  private onTick = (e: TickEvt) => {
    const { breath } = e.detail;
    this.view.render(breath);
  };
}

if (!customElements.get("sae-chamber")) customElements.define("sae-chamber", SaeChamber);
