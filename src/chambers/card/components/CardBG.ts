// src/chambers/card/components/CardBg.ts
export class CardBGEl extends HTMLElement {
  private root!: ShadowRoot;
  private el!: HTMLDivElement;
  private key: "witness"|"heart"|"spirit"|"shadow" = "witness";

  static get observedAttributes() { return ["key"]; }

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = `
      <style>
        :host { display:block; width:100%; height:100%; }
        .bg { position:absolute; inset:0; border-radius:16px; }
      </style>
      <div class="bg"></div>
    `;
  }

  connectedCallback() {
    this.el = this.root.querySelector<HTMLDivElement>(".bg")!;
    this.key = (this.getAttribute("key") as any) ?? "witness";
    // listen for chamber broadcast
    this.addEventListener("card-breath" as any, this.onBreath as any);
  }

  disconnectedCallback() {
    this.removeEventListener("card-breath" as any, this.onBreath as any);
  }

  attributeChangedCallback(name: string, _o: string|null, v: string|null) {
    if (name === "key" && v) this.key = v as any;
  }

  // Event path
  private onBreath = (ev: Event) => {
    const b = (ev as CustomEvent<any>).detail;
    if (!b) return;
    this.applyBreath(b);
  };

  // Direct call path
  public applyBreath(b: { phase:"inhale"|"pause"|"exhale"; value:number }) {
    // simple palette stub per key: varies lightness/chroma by phase
    const base = paletteBase(this.key); // returns {l:number,c:number,h:number}
    const dl = b.phase === "inhale" ? +0.06*b.value : b.phase === "exhale" ? -0.04*b.value : 0.0;
    const dc = b.phase === "inhale" ? +0.01*b.value : 0.0;
    const l = clamp01(base.l + dl);
    const c = clamp01(base.c + dc);
    this.el.style.background = `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${base.h})`;
  }
}

function paletteBase(key: string): {l:number;c:number;h:number} {
  switch (key) {
    case "heart":   return { l: 0.22, c: 0.06, h: 20 };   // warm rose
    case "spirit":  return { l: 0.18, c: 0.05, h: 260 };  // cool indigo
    case "shadow":  return { l: 0.14, c: 0.03, h: 250 };
    case "witness":
    default:        return { l: 0.16, c: 0.04, h: 240 };  // deep slate-blue
  }
}
function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }

declare global {
  interface HTMLElementTagNameMap { "sae-card-bg": CardBGEl; }
}
