export class TraceBuffer {
  private pts: Point[] = [];
  push(p: Point) { this.pts.push(p); if (this.pts.length > 2048) this.pts.shift(); }
  clear() { this.pts.length = 0; }
  get(): Trace { return this.pts; }
}
