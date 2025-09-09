import type { SymbolicUIVocab } from "./types";
let VOCAB: SymbolicUIVocab | null = null;
export function loadVocab(json: unknown) { VOCAB = json as SymbolicUIVocab; return VOCAB; }
export function getVocab() { if (!VOCAB) throw new Error("Vocab not loaded"); return VOCAB; }
