// chambers/field/components/FieldGestureLayerEl.ts
import { TraceBuffer } from "@/systems/gesture/core/TraceBuffer";
import { IntentRouter } from "@/systems/gesture/core/Router";
import { DOMPointerAdapter } from "@/systems/gesture/adapters/DOMpointer";
import { CanvasOverlay } from "@/systems/gesture/adapters/CanvasOverlay";
import type { Intent, SpiralIntent, TapIntent, ZigzagIntent } from "@/systems/gesture/core/Types";

export class FieldGestureLayerEl extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private overlay!: CanvasOverlay;
  private buf = new TraceBuffer();
  private router = new IntentRouter();
  private pointer!: DOMPointerAdapter;

  connectedCallback(){
    this.attachShadow({mode:"open"});
    this.shadowRoot!.innerHTML = `
      <style>:host{position:absolute;inset:0;z-index:100;pointer-events:auto}
      canvas{display:block;width:100%;height:100%;background:transparent;pointer-events:none}</style>
      <canvas></canvas>`;
    this.canvas = this.shadowRoot!.querySelector("canvas")!;
    this.overlay = new CanvasOverlay(this.canvas);

    const ro = new ResizeObserver(() => {
      const r = this.getBoundingClientRect();
      this.overlay.resize(r.width, r.height);
    });
    ro.observe(this);

    // pointer adapter uses host as the input surface
    this.pointer = new DOMPointerAdapter(this, this.buf, this.router);

    // draw trails on updates (optional)
    this.addEventListener("pointermove", () => { this.overlay.clear(); this.overlay.drawTrace(this.buf.get()); });

    // map intents to field accents
    this.router.subscribe((intent: Intent) => this.handleIntent(intent));
  }

  private handleIntent(intent: Intent){
   
    if (intent.kind === "spiral"){
      const s = intent as SpiralIntent;
      const r = this.getBoundingClientRect();
      const pos:[number,number] = [s.center.x / r.width, s.center.y / r.height];
      const strength = Math.min(1, Math.max(0.15, s.radius / (0.35 * Math.min(r.width, r.height))));
      this.dispatchEvent(new CustomEvent("pool:spiral-accent", { detail: { pos, cw: s.dir==="cw", strength }, bubbles:true, composed:true }));
        console.log("accent:dispatch", {pos, strength});

    }
    // zigzag/tap can dispatch their own events similarly
    console.log("test")
  }
}
customElements.define("sae-field-gesture-layer", FieldGestureLayerEl);
