import type { TracePoint } from "@/types/Gesture";

export function resample(points: TracePoint[], n: number): TracePoint[] {
  if (points.length <= 2) return points.slice();
  const total = pathLength(points);
  const step = total / (n - 1);
  const out: TracePoint[] = [points[0]];
  let acc = 0;

  for (let i = 1; i < points.length; i++) {
    let p0 = points[i - 1], p1 = points[i];
    let d = dist(p0, p1);
    while (acc + d >= step) {
      const r = (step - acc) / d;
      const x = p0.x + r * (p1.x - p0.x);
      const y = p0.y + r * (p1.y - p0.y);
      const t = p0.t + r * (p1.t - p0.t);
      out.push({ x, y, t });
      p0 = { x, y, t };
      d = dist(p0, p1);
      acc = 0;
    }
    acc += d;
  }
  if (out.length < n) out.push(points[points.length - 1]);
  return out;
}

export function pathLength(points: TracePoint[]): number {
  let L = 0;
  for (let i = 1; i < points.length; i++) L += dist(points[i - 1], points[i]);
  return L;
}
export function duration(points: TracePoint[]) {
  return Math.max(0, points[points.length - 1].t - points[0].t);
}
export function centroid(points: TracePoint[]) {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  const n = Math.max(1, points.length);
  return { x: x / n, y: y / n };
}

export function winding(points: TracePoint[], c: {x:number;y:number}) {
  // sum signed angle deltas around centroid; compute radial variation
  let turns = 0;
  let prevAng = Math.atan2(points[0].y - c.y, points[0].x - c.x);
  const radii: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const ang = Math.atan2(points[i].y - c.y, points[i].x - c.x);
    let d = ang - prevAng;
    // unwrap
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    turns += d / (2 * Math.PI);
    prevAng = ang;
    radii.push(Math.hypot(points[i].x - c.x, points[i].y - c.y));
  }

  const rMean = radii.reduce((a, b) => a + b, 0) / Math.max(1, radii.length);
  const rVar = radii.reduce((a, r) => a + Math.pow((r - rMean) / Math.max(1, rMean), 2), 0) / Math.max(1, radii.length);

  return { dir: turns > 0 ? "ccw" : "cw", turns, radialVar: rVar };
}

export function directionChanges(points: TracePoint[]) {
  // count sign changes in angle of velocity vector
  let lastSign = 0, count = 0, amp = 0;
  for (let i = 2; i < points.length; i++) {
    const a = angle(points[i - 2], points[i - 1]);
    const b = angle(points[i - 1], points[i]);
    const d = normAngle(b - a);
    const sign = Math.sign(d);
    if (lastSign !== 0 && sign !== 0 && sign !== lastSign) count++;
    lastSign = sign;
    amp += Math.abs(d);
  }
  return { count, amplitude: amp * 180 / Math.PI }; // degrees total
}

export function avgSpeed(points: TracePoint[]) {
  const L = pathLength(points);
  const D = duration(points);
  return D > 0 ? L / D : 0; // px/sec
}

// helpers
function dist(a: TracePoint, b: TracePoint) { return Math.hypot(b.x - a.x, b.y - a.y); }
function angle(a: TracePoint, b: TracePoint) { return Math.atan2(b.y - a.y, b.x - a.x); }
function normAngle(x: number) {
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}
