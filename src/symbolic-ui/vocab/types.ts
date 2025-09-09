export type UID = string;
export type LayerName = "sky" | "walls" | "ground" | "ui";
export type Prox = "near" | "mid" | "far";
export type DayPhase = "dawn" | "day" | "dusk" | "night";

export interface GlyphDef { id: UID; svg: string; layer: LayerName; }
export interface SymbolicPhrase { id: UID; label: string; glyph?: UID; gestalts?: UID[]; }

export interface GestaltDef {
  id: UID;
  when: { sunProximity?: Prox; moonProximity?: Prox; phase?: DayPhase };
  effects: { auraGain?: number; ringPulse?: number; ribbonWeight?: number; shaderFlags?: string[]; };
  phrase?: UID;
}

export interface SymbolicUIVocab {
  version: string;
  glyphs: GlyphDef[];
  phrases?: SymbolicPhrase[];
  gestalts?: GestaltDef[];
  chambers?: { id: UID; allows: UID[] }[];
}
