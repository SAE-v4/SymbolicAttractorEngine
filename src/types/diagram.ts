export interface BreathDynamic {
  inhale: string;
  exhale: string;
  pause: string;
}

export type ChamberLayer = "sky" | "walls" | "ground";

export interface DiagramPhrase {
  id: string;
  phrase_glyph_id: string; // references PhraseGlyph.id
  geometry: string;
  breath_dynamic: BreathDynamic;
  layers: ChamberLayer[];
  seasonal_emphasis?: string[];
  interaction_notes?: string;
}
