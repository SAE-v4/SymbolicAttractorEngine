// utils/chamberLoader.ts
import yaml from "js-yaml";

export async function loadChamberDefPublic(path: string) {
  const res = await fetch(path); // e.g. "/chambers/spiral-gate.yaml"
  const text = await res.text();

  // sanity guard: if dev server returned index.html
  if (res.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`Expected YAML, got HTML from ${path}`);
  }
  return yaml.load(text);
}
