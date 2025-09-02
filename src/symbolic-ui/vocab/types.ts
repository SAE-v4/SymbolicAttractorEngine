export type UID = string;

export type LayerName = "sky" | "walls" | "ground" | "ui";
export type Prox = "near" | "mid" | "far";
export type DayPhase = "dawn" | "day" | "dusk" | "night";

export interface SymbolicEffects {
  auraGain?: number;     // Gate aura intensity
  ringPulse?: number;    // Ring flash impulse
  ribbonWeight?: number; // Spiral thickness/weight
  shaderFlags?: string[]; // Hints to GL/2D layers
}

export interface SymbolicPhrase {
  id: UID;
  label: string;
  glyph?: UID;
  gestalts?: UID[];
}

export interface GlyphDef {
  id: UID;
  svg: string;
  layer: LayerName;
  palette?: UID;
  anchors?: string[];
}

export interface GestureDef {
  id: UID;
  input: "pointer" | "keys" | "gamepad";
  vector?: "facing" | "orbit" | "radial";
  intent: "select" | "focus" | "offer" | "receive" | "breathe" | "move";
}

export interface GestaltDef {
  id: UID;
  when: { sunProximity?: Prox; moonProximity?: Prox; phase?: DayPhase };
  effects: SymbolicEffects;
  phrase?: UID;
}

export interface ChamberLink { id: UID; allows: UID[]; }

export interface SymbolicUIVocab {
  version: string;
  glyphs: GlyphDef[];
  gestures: GestureDef[];
  gestalts?: GestaltDef[];
  phrases?: SymbolicPhrase[];
  chambers?: ChamberLink[];
}
