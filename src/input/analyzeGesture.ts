// src/input/AnalyzeGesture.ts

import type { GesturePoint, GestureMetrics, Vec2 } from "@/types/core";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function dist(a: Vec2, b: Vec2) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Signed area proxy for "overall turning direction" (shoelace on the polyline)
// Positive/negative depends on coordinate system, but sign will be consistent for your UI.
function signedArea(points: GesturePoint[]) {
  let a = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    a += p.x * q.y - q.x * p.y;
  }
  return 0.5 * a;
}

export function analyzeGesture(points: GesturePoint[]): GestureMetrics {
  // Defensive defaults
  if (!points || points.length < 2) {
    return {
      strength: 0,
      centroid: { x: points?.[0]?.x ?? 0, y: points?.[0]?.y ?? 0 },
      curvature: 0,
      jaggedness: 0,
      speed: 0,
    };
  }

  // 1) Basic aggregates
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;

  for (const p of points) {
    sumX += p.x; sumY += p.y;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const centroid = { x: sumX / points.length, y: sumY / points.length };

  // 2) Length + duration
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += dist(points[i - 1], points[i]);
  }

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const dtMs = Math.max(1, t1 - t0);
  const dtS = dtMs / 1000;

  // 3) Smoothness/jaggedness: measure turning angle changes along the path
  // We compute average absolute angle delta between successive segments.
  let turnSum = 0;
  let turnCount = 0;

  for (let i = 2; i < points.length; i++) {
    const a = points[i - 2];
    const b = points[i - 1];
    const c = points[i];

    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;

    const n1 = Math.hypot(v1x, v1y);
    const n2 = Math.hypot(v2x, v2y);
    if (n1 < 1e-3 || n2 < 1e-3) continue;

    const dot = (v1x * v2x + v1y * v2y) / (n1 * n2);
    const d = Math.max(-1, Math.min(1, dot));
    const ang = Math.acos(d); // 0..π
    turnSum += ang;
    turnCount++;
  }

  const avgTurn = turnCount ? (turnSum / turnCount) : 0; // radians
  // Map: 0 rad (straight) -> 0 jagged, ~0.8 rad (~45°) -> high jagged
  const jaggedness = clamp01(avgTurn / 0.8);

  // 4) Curvature: combine "curviness" (how non-straight) with direction sign.
  // Curviness magnitude: compare length to diagonal of bounding box (more curved => longer vs diag)
  const boxDiag = Math.hypot(maxX - minX, maxY - minY);
  const curviness = boxDiag > 1e-3 ? clamp01((length / boxDiag - 1) / 1.2) : 0;

  // Direction sign from signed area (consistent per device)
  const area = signedArea(points);
  const sign = area === 0 ? 0 : area > 0 ? 1 : -1;
  const curvature = sign * curviness;

  // 5) Speed: normalise length per second to 0..1
  const speedPxPerS = length / dtS;
  // These bounds are “feels right” on phones; tweak later.
  const speed = clamp01((speedPxPerS - 250) / (1400 - 250));

  // 6) Strength: a blend of length + speed, penalised by extreme jaggedness
  // (jagged scribbles shouldn’t always read as “stronger” than a confident stroke)
  const lengthN = clamp01((length - 20) / (260 - 20));
  const strengthRaw = 0.70 * lengthN + 0.30 * speed;
  const strength = clamp01(strengthRaw * (1 - 0.25 * jaggedness));

  return { strength, centroid, curvature, jaggedness, speed };
}
