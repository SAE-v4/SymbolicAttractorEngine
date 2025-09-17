import { registerCardChamber } from "./card";
export type ChamberKind = "card" | "solarSpiralGate"; // keep legacy on main
export function registerChambers(kind: ChamberKind) {
  if (kind === "card") registerCardChamber();
  // legacy hook stays as-is
}
