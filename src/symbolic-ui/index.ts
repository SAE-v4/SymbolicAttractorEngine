import type { SymbolicUIVocab } from "./types";
let VOCAB: SymbolicUIVocab;

export function loadVocab(json: unknown) {
  VOCAB = json as SymbolicUIVocab; // lightweight for now; tighten later with schema
  return VOCAB;
}
export const getVocab = () => VOCAB;
