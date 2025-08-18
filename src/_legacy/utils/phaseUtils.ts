// Centralised helper: convert continuous phase into discrete beat events.
export function crossed(thresholds: number[], prev: number, curr: number) {
  for (const t of thresholds) {
    const hit = (prev <= t && curr >= t) ||
                (prev > curr && (curr >= t || prev <= t)); // wrap-around
    if (hit) return t;
  }
  return null;
}
