// src/components/sae-world-root.ts
// Minimal scaffold for the new SAE world view.

import "./layers/sae-layer-garden";
import "./layers/sae-layer-tree";
import "./layers/sae-layer-hive";
import "./layers/sae-layer-ui";

export class SaeWorldRoot extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    // Simple, layered layout using absolute positioning.
    this.shadow.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: radial-gradient(circle at center, #050509, #020207);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .layer-ui {
          pointer-events: auto; /* UI receives events, others are visual only */
        }
      </style>

      <div class="layer">
        <sae-layer-garden></sae-layer-garden>
      </div>

      <div class="layer">
        <sae-layer-tree></sae-layer-tree>
      </div>

      <div class="layer">
        <sae-layer-hive></sae-layer-hive>
      </div>

      <div class="layer layer-ui">
        <sae-layer-ui></sae-layer-ui>
      </div>
    `;
  }
}

customElements.define("sae-world-root", SaeWorldRoot);
