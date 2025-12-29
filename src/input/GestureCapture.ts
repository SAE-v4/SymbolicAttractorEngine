import type { GesturePoint } from "@/types/core";

export class GestureCapture {
  points: GesturePoint[] = [];
  active = false;

  start(x: number, y: number) {
    this.points = [{ x, y, t: performance.now() }];
    this.active = true;
  }

  move(x: number, y: number) {
    if (!this.active) return;
    this.points.push({ x, y, t: performance.now() });
  }

  end(x: number, y: number): GesturePoint[] | null {
    if (!this.active) return null;
    this.points.push({ x, y, t: performance.now() });
    this.active = false;
    return this.points;
  }
}
