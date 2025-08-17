import { load } from "js-yaml";
import type { ChamberDef } from "@types/ChamberDef";

export async function loadChamberDef(path: string): Promise<ChamberDef> {
  const text = await fetch(path).then(r => r.text());
  return load(text) as ChamberDef;
}