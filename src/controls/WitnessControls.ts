export class WitnessControls {
  private dragging = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private onFace: (dx: number, dy: number) => void,
    private onThrust: (amt: number) => void,
    private getWitnessPos: () => { x: number; y: number }, // NEW
  ) {
    canvas.addEventListener("pointerdown", this.onDown, { passive: true });
    canvas.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerup", this.onUp, { passive: true });
    window.addEventListener("keydown", this.onKey);
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    const v = this.vectorFromWitness(e);
    this.onFace(v.x, v.y);
    this.onThrust(0.5);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const v = this.vectorFromWitness(e);
    this.onFace(v.x, v.y);
  };

  private onUp = () => { this.dragging = false; };

  private onKey = (e: KeyboardEvent) => {
    const map: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1],
      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    };
    const v = map[e.key];
    if (!v) return;
    this.onFace(v[0], v[1]);
    this.onThrust(0.5);
  };

  // Vector from witness position -> pointer (all in CSS px)
  private vectorFromWitness(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const { x: wx, y: wy } = this.getWitnessPos();
    return { x: px - wx, y: py - wy };
  }
}
