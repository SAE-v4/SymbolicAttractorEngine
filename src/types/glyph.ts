export type BaseGlyphCategory =
  | "point" | "circle" | "spiral" | "line"
  | "triangle" | "heart" | "droplet" | "crescent" | "vesica";

export interface BaseGlyph {
  id: string;
  name: string;
  category: BaseGlyphCategory;
  svg_hint: string;
  notes?: string;
}

export interface PhraseGlyphComponent {
  base_id: string;        // references BaseGlyph.id
  role: string;           // e.g., 'axis', 'seed', 'vessel'
  transform_hint?: string;
}

export interface PhraseGlyph {
  id: string;
  title: string;
  components: PhraseGlyphComponent[];
  layout: string;         // 'axis' | 'cluster' | 'spiral' | ...
  breath_dynamic_hint?: string;
  tags?: string[];
}
