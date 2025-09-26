import type { DayPhase } from "@/types/";
import type { Lens } from "@/types/";
export function lensForPhase(p: DayPhase): Lens {
  if (p === "dawn") return "observatory";
  if (p === "day")  return "garden";
  if (p === "dusk") return "witness";
  return "organ";
}
