// Breath-synced gradient background (viewport).
import type { BreathPhase } from "@/types/Core";
type LocalBreath = { phase: BreathPhase; value: number; bpm: number; tGlobal: number; };

export class FieldBGEl extends HTMLElement {
  static get observedAttributes() { return ["key"]; } // e.g., key="witness"
  private key: string = "witness";

  constructor() { super(); this.attachShadow({ mode:"open" }); }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host { position:absolute; inset:0; display:block; }
        .bg { position:absolute; inset:0; }
      </style>
      <div class="bg"></div>
    `;
  }

  attributeChangedCallback(n:string,_o:string|null,v:string|null){
    if (n==="key" && v) this.key = v;
  }

  applyBreath(b: LocalBreath) {
    const el = this.shadowRoot!.querySelector(".bg") as HTMLDivElement;
    const l0 = 0.10, c0 = 0.03, hue = this.key === "witness" ? 250 : 230;
    const l1 = l0 + (b.phase==="inhale" ? 0.06*b.value : b.phase==="exhale" ? -0.04*b.value : 0);
    const c1 = c0 + (b.phase==="exhale" ? 0.02*b.value : 0);

    el.style.background = `
      radial-gradient(120% 90% at 50% 0%,
        oklch(${(l1+0.08).toFixed(3)} ${(c1+0.02).toFixed(3)} ${hue}) 0%,
        oklch(${(l1).toFixed(3)} ${c1.toFixed(3)} ${hue}) 50%,
        oklch(${(l1-0.03).toFixed(3)} ${(Math.max(0,c1-0.01)).toFixed(3)} ${hue}) 100%)
    `;
  }
}
