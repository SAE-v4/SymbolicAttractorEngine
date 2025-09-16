# Data — Schemas & Seeds (Card Chamber)

📍 Location: `src/docs/chambers/card/Data.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

This document specifies the **data layer** for the Card chamber: file layout, JSON/TS schemas, validation rules, and seed examples for **beings**, **glyphs**, **phrase templates**, **lexicon**, and **diagram phrases**.

It aims to keep content **portable, testable, and versioned** across slices.

---

## 🗂 Directory Layout

All chamber‑specific data lives under:

```
src/chambers/card/data/
  beings/
    heart-spirit.json
  glyphs.json
  templates.json
  lexicon.json
  diagram_phrases.json        // optional, for radar/cross/corona expansions
  theme.json                  // optional per-chamber theme override
  versions.json               // content version stamps
```

> Renderer assets (SVG) live in `assets/glyphs/` and are referenced by `svg` ids (e.g., `#g-heart`).

---

## 🔢 Common Conventions

- **IDs**: kebabCase for files; camelCase for in‑object ids.  
- **Vec7** order: `[Light, Warmth, Heart, Flame, Inhale, Scale, Witness]`.  
- **BreathPhase**: `"inhale" | "pause" | "exhale"`.  
- **ColorKey**: `"light"|"shadow"|"warmth"|"coolness"|"heart"|"spirit"|"flame"|"offering"|"witness"`.

---

## 🧩 Schemas

### 1) Glyphs (`glyphs.json`)

**TypeScript**

```ts
export type GlyphId =
  | "heart" | "spiral" | "zigzag"
  | "flame" | "witness" | "sun" | "moon" | "seal"
  | "harmonic-cross" | "aura-radar" | "crown-corona";

export type Vec7 = [number, number, number, number, number, number, number];

export interface GlyphSpec {
  id: GlyphId;
  label: string;
  kind: "core" | "gesture" | "diagram";
  svg?: string;                 // "#g-heart"
  procedural?: "spiral"|"radar"|"cross"|"corona";
  vec?: Vec7;                   // diagrams may omit
  gestures?: Array<"trace-spiral"|"trace-zigzag"|"tap-hold"|"circle-seal">;
  offerable?: boolean;          // draggable from Vessel?
  colorKey: "light"|"shadow"|"warmth"|"coolness"|"heart"|"spirit"|"flame"|"offering"|"witness";
  breathAnim: {
    scale: [number, number];    // 0.5..1.5 typical
    opacity: [number, number];  // 0..1
  };
  audio?: {
    gesture?: string;
    offer?: string;
    receive?: string;
    harmonic?: string;
  };
}
export type GlyphCatalog = Record<GlyphId, GlyphSpec>;
```

**JSON Schema (excerpt)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "patternProperties": {
    "^[a-z0-9-]+$": {
      "type": "object",
      "required": ["id","label","kind","colorKey","breathAnim"],
      "properties": {
        "id": { "type": "string" },
        "label": { "type": "string", "minLength": 1 },
        "kind": { "enum": ["core","gesture","diagram"] },
        "svg": { "type": "string" },
        "procedural": { "enum": ["spiral","radar","cross","corona"] },
        "vec": {
          "type": "array", "minItems": 7, "maxItems": 7,
          "items": { "type": "number" }
        },
        "gestures": {
          "type": "array",
          "items": { "enum": ["trace-spiral","trace-zigzag","tap-hold","circle-seal"] }
        },
        "offerable": { "type": "boolean" },
        "colorKey": {
          "enum": ["light","shadow","warmth","coolness","heart","spirit","flame","offering","witness"]
        },
        "breathAnim": {
          "type": "object",
          "required": ["scale","opacity"],
          "properties": {
            "scale": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number" } },
            "opacity": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "number" } }
          }
        },
        "audio": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      }
    }
  }
}
```

**Seed example** — heart/spiral/zigzag omitted for brevity; see `CardLayoutGlyphs.md`.

---

### 2) Beings (`beings/*.json`)

**TypeScript**

```ts
export interface BeingSpec {
  id: string;                        // "heartSpirit"
  title: string;                     // "Heart / Spirit"
  vec: Vec7;
  phaseWeights?: { inhale:number; pause:number; exhale:number };
  thresholds: { accept:number; harmonic:number };
  palette: { aura: "heart"|"spirit"|"witness"; crown?: "spirit"|"light"|"flame" };
  notes?: string;
}
```

**JSON example**

```json
{
  "id": "heartSpirit",
  "title": "Heart / Spirit",
  "vec": [0.1,0.1,0.9,0.2,0.3,0.0,0.5],
  "phaseWeights": { "inhale": 1.0, "pause": 0.7, "exhale": 0.4 },
  "thresholds": { "accept": 0.72, "harmonic": 0.86 },
  "palette": { "aura": "heart", "crown": "spirit" }
}
```

**Validation rules**
- `0 ≤ thresholds.accept < thresholds.harmonic ≤ 1`.  
- `|vec| > 0` (non‑zero); recommend normalized vectors for cosine scoring.

---

### 3) Phrase Templates (`templates.json`)

See also [PhraseTemplates.md](./PhraseTemplates.md).

**TypeScript**

```ts
export interface TemplateSpec {
  id: string;                              // "gift-of-x"
  pattern: string;                          // "Gift of {glyph}"
  placeholders: Array<"glyph"|"token">;
  axisBias?: Partial<Record<
    "Light"|"Warmth"|"Heart"|"Flame"|"Inhale"|"Scale"|"Witness", number
  >>;
  phase?: Array<"inhale"|"pause"|"exhale">; // allowed phases
  outcome?: Array<"accept"|"harmonic">;     // allowed outcomes
  weight?: number;                          // selection weight (default 1)
}
export type TemplateCatalog = TemplateSpec[];
```

**JSON example**

```json
[
  {
    "id": "gift-of-x",
    "pattern": "Gift of {glyph}",
    "placeholders": ["glyph"],
    "axisBias": { "Flame": 0.4, "Warmth": 0.2 },
    "phase": ["inhale","exhale"],
    "outcome": ["accept","harmonic"],
    "weight": 1
  },
  {
    "id": "crown-of-x",
    "pattern": "The Crown of {token}",
    "placeholders": ["token"],
    "axisBias": { "Witness": 0.5, "Scale": 0.3 },
    "phase": ["pause"],
    "outcome": ["harmonic"],
    "weight": 1
  }
]
```

**Validation rules**
- `pattern` must include placeholders present in `placeholders`.  
- If `phase`/`outcome` omitted → template is eligible for all.

---

### 4) Lexicon (`lexicon.json`)

**TypeScript**

```ts
export interface TokenSpec {
  word: string;
  vec: Partial<Vec7> | Vec7;        // allow partials; missing axes default 0
  tags?: string[];                  // "seasonal","elemental","crown", etc.
  weight?: number;                  // selection weighting (default 1)
}
export type Lexicon = TokenSpec[];
```

**JSON example**

```json
[
  { "word": "gift", "vec": [0,0.2,0.3,0.1,0,0,0.1], "tags": ["offering"] },
  { "word": "breath", "vec": [0.05,0,0.1,0,0.4,0.2,0.2], "tags": ["metabolic"] },
  { "word": "crown", "vec": [0.1,0,0.15,0,0.05,0.25,0.35], "tags": ["witness","scale"] }
]
```

**Validation rules**
- `word` non‑empty; a–z plus hyphen/space; deduplicate case‑insensitively.  
- Clamp vector components to `[-1..1]`.

---

### 5) Diagram Phrases (`diagram_phrases.json`) — optional

Bind outcomes or template ids to **diagrammatic** responses (for **WitnessRadar** / **BeingAura**).

**TypeScript**

```ts
export interface DiagramPhrase {
  when: { templateId?: string; outcome?: "accept"|"harmonic"; };
  emit: Array<
    | { kind:"harmonic-cross"; intensity?: number }
    | { kind:"aura-radar"; ring?: number; life?: number }
    | { kind:"crown-corona"; rayCount?: number }
  >;
}
export type DiagramPhraseCatalog = DiagramPhrase[];
```

**JSON example**

```json
[
  { "when": { "outcome": "harmonic" }, "emit": [ { "kind": "harmonic-cross", "intensity": 1.0 } ] }
]
```

---

### 6) Theme (`theme.json`) — optional

Override or extend [Palette.md](./Palette.md) per chamber.

```json
{
  "id": "card-default",
  "entries": { "heart": { "base": { "l": 0.70, "c": 0.20, "h": 25 } } },
  "bg": { "l": 0.93, "c": 0.02, "h": 100 },
  "walls": { "l": 0.80, "c": 0.04, "h": 240 }
}
```

---

## ✅ Validation & Tooling

- Use a lightweight validator (e.g., `ajv`) against the JSON Schemas.  
- CI gate: **fail build** on invalid data or duplicate ids.  
- Provide **lint scripts** to clamp vectors into `[-1..1]` and normalise where required.  
- Add small **sample generators** for dev (e.g., seed lexicon with 10 words).

---

## 🧪 Test Fixtures

- `tests/data/*.json` with **minimal** and **edge** examples for each schema.  
- Golden set of phrase generations mapping `(outcome, phase)` → template id.  
- Verify `GlyphCatalog` contains MVP trio: `heart`, `spiral`, `zigzag`.

---

## 🔁 Versioning & Migration

- `versions.json` holds `{ schemaVersion, contentVersion, date }`.  
- If a schema changes, bump `schemaVersion` and ship a migration script with explicit field remaps (e.g., `procedural` enum additions).

**Example**
```json
{
  "schemaVersion": "1.0.0",
  "contentVersion": "2025-09-16",
  "date": "2025-09-16"
}
```

---

## 🔗 Related

- [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)  
- [SemanticField.md](./SemanticField.md)  
- [PhraseTemplates.md](./PhraseTemplates.md)  
- [CoherenceEngine.md](./CoherenceEngine.md)  
- [Renderers.md](./Renderers.md)  
- [Palette.md](./Palette.md)

---
