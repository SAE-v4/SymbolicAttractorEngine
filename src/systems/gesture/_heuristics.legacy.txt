import type { GestureIntent, GestureKind } from "@/types/Gesture";

type Pt = { x:number; y:number; t:number };

export function classifyPath(path: Pt[]): GestureIntent {
  if (path.length < 4) return { kind:"unknown", strength:0, duration:0, path };

  const duration = path[path.length-1].t - path[0].t;

  // --- basic stats ---
  let len = 0;
  for (let i=1;i<path.length;i++) {
    len += Math.hypot(path[i].x - path[i-1].x, path[i].y - path[i-1].y);
  }
  const dx = path[path.length-1].x - path[0].x;
  const dy = path[path.length-1].y - path[0].y;
  const disp = Math.hypot(dx, dy);

  // compactness: how loopy vs straight (1 = very loopy)
  const compact = Math.min(1, len > 0 ? 1 - disp/len : 0);

  // turn sum: approximate signed curvature (+cw / -ccw depending on screen coords)
  let turn = 0;
  for (let i=2;i<path.length;i++) {
    const a = path[i-2], b = path[i-1], c = path[i];
    const v1x = b.x-a.x, v1y = b.y-a.y;
    const v2x = c.x-b.x, v2y = c.y-b.y;
    const z = v1x*v2y - v1y*v2x; // cross product z
    turn += z;
  }
  const cw = turn < 0;

  // simple angle variance => zigzag-ish if lots of sign flips
  let flips = 0;
  for (let i=2;i<path.length;i++) {
    const a = path[i-2], b = path[i-1], c = path[i];
    const z1 = (b.x-a.x)*(c.y-b.y) - (b.y-a.y)*(c.x-b.x);
    const z0 = (a.x-(path[i-3]?.x ?? a.x)) * (b.y-(path[i-3]?.y ?? a.y)) - (a.y-(path[i-3]?.y ?? a.y)) * (b.x-(path[i-3]?.x ?? a.x));
    if (Math.sign(z1) !== Math.sign(z0)) flips++;
  }
  const flipRate = flips / Math.max(1, path.length-3);

  // --- decisions ---
  // tap-hold: short displacement, short path length, but non-trivial duration
  if (disp < 16 && len < 48 && duration > 0.16) {
    return { kind:"tap-hold", strength: clamp01(duration/1.0), duration, path };
  }

  // spiral-ish: compact + meaningful length + decent turn magnitude
  if (compact > 0.35 && len > 120 && Math.abs(turn) > 2000) {
    const strength = clamp01(0.5*compact + 0.5*clamp01(Math.abs(turn)/4000));
    return { kind:"spiral", cw, strength, duration, path };
  }

  // zigzag-ish: not compact (more linear) but with frequent direction flips
  if (compact < 0.25 && flipRate > 0.15 && len > 100) {
    const strength = clamp01(0.6*flipRate + 0.4*(1-compact));
    return { kind:"zigzag", strength, duration, path };
  }

  return { kind:"unknown", strength:0.2, duration, path };
}

function clamp01(v:number){ return Math.max(0, Math.min(1, v)); }
