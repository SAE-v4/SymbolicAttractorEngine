// src/app/engine-root.ts
import { CHAMBERS } from '@chambers/registry';
import type { Chamber } from '@types/Chamber';

export class EngineRoot extends HTMLElement {
  static get observedAttributes() { return ['ch','debug']; }

  #host!: HTMLDivElement;
  #unmount: (() => void) | null = null;
  #mounted = false;

  connectedCallback() {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { display:block; position:relative; width:100%; height:100%; }
          .host {
            position:absolute; inset:0;
            padding-top: env(safe-area-inset-top);
            padding-right: env(safe-area-inset-right);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
          }
        </style>
        <div class="host" id="host"></div>
      `;
    }
    this.#host = this.shadowRoot!.getElementById('host') as HTMLDivElement;

    if (!this.#mounted) { this.#mounted = true; this.#mount(); }
  }

  attributeChangedCallback(name: string, oldV: string|null, newV: string|null) {
    if (oldV === newV) return;
    if (!this.isConnected || !this.shadowRoot || !this.#host) return;
    this.#remount();
  }

  disconnectedCallback() {
    this.#unmount?.(); this.#unmount = null;
    this.#mounted = false;
  }

  #mount() {
    const q = new URLSearchParams(location.search);
    const pick = this.getAttribute('ch') || q.get('ch') || localStorage.getItem('sae.lastChamber');
    const chamber: Chamber | undefined =
      CHAMBERS.find(c => c.manifest.id === pick) ?? CHAMBERS[0];
    if (!chamber) return;

    localStorage.setItem('sae.lastChamber', chamber.manifest.id);
    const debug = this.hasAttribute('debug') || q.get('debug') === '1';

    const rect = this.getBoundingClientRect();
    const ret = chamber.mount({
      root: this.#host,
      size: { width: rect.width, height: rect.height },
      debug,
    });
    this.#unmount = ret?.unmount ?? null;
  }

  #remount() {
    this.#unmount?.(); this.#unmount = null;
    this.#host.innerHTML = '';
    this.#mount();
  }

  // Ergonomic property accessors (optional)
  get ch() { return this.getAttribute('ch'); }
  set ch(v: string | null) { v == null ? this.removeAttribute('ch') : this.setAttribute('ch', v); }
  get debug() { return this.hasAttribute('debug'); }
  set debug(v: boolean) { v ? this.setAttribute('debug','') : this.removeAttribute('debug'); }
}

if (!customElements.get('engine-root')) {
  customElements.define('engine-root', EngineRoot);
}

declare global {
  interface HTMLElementTagNameMap {
    'engine-root': EngineRoot;
  }
}
