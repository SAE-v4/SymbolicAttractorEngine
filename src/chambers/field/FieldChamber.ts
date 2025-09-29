// // Full-viewport container with symbolic slots.
// // Listens to engine-tick and rebroadcasts as `field-breath`.
// // Keeps DOM minimal; real work lives in slotted components.

// import type { EngineTick, BreathPhase } from "@/types/Core";

// type LocalBreath = {
//   phase: BreathPhase;
//   value: number;    // 0..1 in-phase; 0.5 during pause
//   bpm: number;
//   tGlobal: number;
// };

// export class FieldChamberEl extends HTMLElement {
//   constructor() {
//     super();
//     this.attachShadow({ mode: "open" });
//   }

//   connectedCallback() {
//     this.shadowRoot!.innerHTML = `
//       <style>
//         :host { display:block; position:relative; width:100%; height:100%; }
//         .stack { position:absolute; inset:0; }
//         .layer { position:absolute; inset:0; }
//       </style>

//         <div class="layer">
//           <slot name="bg"><sae-field-bg></sae-field-bg></slot>
//         </div>
//         <div class="layer">
//           <slot name="walls"><sae-field-witness></sae-field-witness></slot>
//         </div>
//         <div class="layer">
//           <slot name="ui"></slot>
//         </div>
//               <div class="stack">
//         <div class="layer input">
//           <slot name="ground"><sae-field-gesture-layer></sae-field-gesture-layer></slot>
//         </div>
//       </div>
//     `;

//     this.addEventListener("engine-tick" as any, this.onEngineTick as any);


//   }

//   disconnectedCallback() {
//     this.removeEventListener("engine-tick" as any, this.onEngineTick as any);
//   }

//   public onBreathTick(detail: EngineTick) {
//     this.applyBreath(normalize(detail));
//   }

//   private onEngineTick = (ev: Event) => {
//     const ce = ev as CustomEvent<EngineTick>;
//     if (!ce.detail) return;
//     this.applyBreath(normalize(ce.detail));
//   };

//   private applyBreath(b: LocalBreath) {
//     // Broadcast to slotted children
//     const ev = new CustomEvent("field-breath", { detail: b, bubbles: true, composed: true });
//     this.dispatchEvent(ev);

//     // Call applyBreath if exposed
//     const callApply = (el: Element | null) => {
//       const anyEl = el as any;
//       if (anyEl && typeof anyEl.applyBreath === "function") anyEl.applyBreath(b);
//     };
//     // bg / ground / walls / sky / ui
//     ["bg", "ground", "walls", "sky", "ui"].forEach(name => {
//       const s = this.shadowRoot!.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null;
//       s?.assignedElements().forEach(callApply);
//     });
//   }
// }

// function normalize(detail: EngineTick): LocalBreath {
//   const { phase, bpm, value: v } = detail.breath;
//   const v01 = (v + 1) / 2;
//   const value = phase === "inhale" ? v01 : phase === "exhale" ? 1 - v01 : 0.5;
//   return { phase, value, bpm, tGlobal: detail.time };
// }
