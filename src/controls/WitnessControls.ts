export class WitnessControls {
  private dragging = false;
  private last = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private onFace: (dx: number, dy: number) => void,
    private onThrust: (amt: number) => void,
  ) {
    canvas.addEventListener("pointerdown", this.onDown, { passive: true });
    canvas.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerup", this.onUp, { passive: true });
    window.addEventListener("keydown", this.onKey);
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.last = this.norm(e);
    this.onFace(this.last.x, this.last.y);
    this.onThrust(0.5);
  };
  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const v = this.norm(e);
    this.onFace(v.x, v.y);
  };
  private onUp = () => { this.dragging = false; };

  private onKey = (e: KeyboardEvent) => {
    const map: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    };
    const v = map[e.key];
    if (!v) return;
    this.onFace(v[0], v[1]);
    this.onThrust(0.5);
  };

  private norm(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2));
    const dy = (e.clientY - (r.top + r.height / 2));
    return { x: dx, y: dy };
  }
}
