// Minimal witness arcs (viewport scale). Breath only affects subtle alpha.
import type { BreathPhase } from "@/types/Core";
type LocalBreath = { phase: BreathPhase; value: number; bpm: number; tGlobal: number; };

export class FieldWitnessEl extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private dpr = Math.max(1, devicePixelRatio || 1);
  private lastT = 0;

  constructor(){ super(); this.attachShadow({mode:"open"}); }

  connectedCallback(){
    this.shadowRoot!.innerHTML = `
      <style>:host{position:absolute;inset:0;display:block}canvas{width:100%;height:100%;display:block}</style>
      <canvas></canvas>
    `;
    this.canvas = this.shadowRoot!.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d");

    const resize = () => {
      const rect = this.getBoundingClientRect();
      this.canvas.width  = Math.max(1, Math.floor(rect.width * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
      this.draw(this.lastT);
    };
    new ResizeObserver(resize).observe(this);
    resize();
  }

  applyBreath(b: LocalBreath){ this.lastT = b.tGlobal; this.draw(this.lastT); }

  private draw(t:number){
    if (!this.ctx) return;
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const W = w/this.dpr, H = h/this.dpr;
    const cx = W/2, cy = H*0.62;
    const maxR = Math.min(W,H)*0.55;

    ctx.globalAlpha = 0.18;
    for (let i=0;i<7;i++){
      const r = maxR * (0.25 + 0.08*i);
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI*0.1, Math.PI*0.9);
      ctx.strokeStyle = `oklch(0.86 0.05 ${240 + ((t*35 + i*7)%30)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }
}
