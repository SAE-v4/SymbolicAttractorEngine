import { TraceBuffer } from "../core/TraceBuffer";
import { inferIntents } from "../core/Heuristics";
import { IntentRouter } from "../core/Router";
import { Point } from "../core/Types";

export class DOMPointerAdapter {
  constructor(
    private host: HTMLElement,
    private buf: TraceBuffer,
    private router: IntentRouter
  ) {
    host.addEventListener("pointerdown", this.onDown, { passive:false });
    host.addEventListener("pointermove", this.onMove, { passive:false });
    host.addEventListener("pointerup",   this.onUp,   { passive:false });
    host.addEventListener("pointercancel", this.onUp, { passive:false });
  }
  private isDown = false;
  private onDown = (e: PointerEvent) => { this.isDown = true; this.buf.clear(); this.push(e); console.log("Down!")};
  private onMove = (e: PointerEvent) => { if (!this.isDown) return; this.push(e); };
  private onUp   = (e: PointerEvent) => {
    if (!this.isDown) return; this.isDown = false; this.push(e);
    for (const intent of inferIntents(this.buf.get())) this.router.publish(intent);
  };
  private push(e: PointerEvent){
    const r = this.host.getBoundingClientRect();
    const p: Point = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now()/1000 };
    this.buf.push(p);
  }
  dispose(){ /* remove listeners */ }
}
