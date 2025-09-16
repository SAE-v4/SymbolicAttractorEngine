# DialogueSystem — Card Chamber

📍 Location: `src/docs/chambers/card/DialogueSystem.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

The **DialogueSystem** is responsible for **emitting text phrases** in the Card chamber.  
It takes **outcomes** from the [CoherenceEngine.md](./CoherenceEngine.md), selects **templates** from [PhraseTemplates.md](./PhraseTemplates.md), fills them with **tokens/glyphs**, and displays them ephemerally in the chamber UI.

---

## 🧠 Conceptual Model

- Dialogue in this build is **minimal and poetic**.  
- English words appear sparingly, as overlays or arc inscriptions.  
- Phrases are not “chatty” text, but **symbolic crystallisations** of field events.  
- Dialogue acts as a **reflection of coherence**, not direct narration.

---

## 🔄 Flow

1. **Input signals**:  
   - Outcome (`reject`, `accept`, `harmonic`) from CoherenceEngine.  
   - Active glyph from FocusVessel.  
   - Current breath phase.  
   - Token affinities from SemanticField.  
   - Being vector (beings/*.json).  

2. **Template selection**:  
   - Filter phrase templates by outcome & breath phase.  
   - Pick best match by cosine similarity of axisBias vs current field vector.  

3. **Phrase generation**:  
   - Fill placeholders with glyph labels or tokens.  
   - Optionally add **diagram glyphs** as echoes.  

4. **Display**:  
   - Send phrase text → SeedPhraseOverlay (short‑lived overlay).  
   - Log phrase → LoreArchiveView (persistent history).  

---

## 📑 Interfaces (TypeScript)

```ts
export interface DialogueInput {
  outcome: OutcomeKind;           // from CoherenceEngine
  glyphId: GlyphId;               // current focus glyph
  breath: { phase: BreathPhase; value: number };
  beingVec: Vec7;                 // current being vector
}

export interface DialoguePhrase {
  id: string;
  text: string;
  tokens: string[];
  glyphs: GlyphId[];
  outcome: OutcomeKind;
  phase: BreathPhase;
}

export interface DialogueSystem {
  generate(input: DialogueInput): DialoguePhrase;
}
```

---

## 🌀 Example Generation

Input:  
```json
{
  "outcome": "harmonic",
  "glyphId": "heart",
  "breath": { "phase": "pause", "value": 0.95 },
  "beingVec": [0.1,0.1,0.9,0.2,0.3,0.0,0.5]
}
```

Process:  
- Outcome = harmonic → prefer exalted templates.  
- Breath = pause → select contemplative style (Witness/Scale).  
- Template: `"The Crown of {token}"`.  
- Token chosen: `"gift"` (best axis match).  

Output:  
```json
{
  "id": "crown-of-x",
  "text": "The Crown of Gift",
  "tokens": ["gift"],
  "glyphs": ["heart"],
  "outcome": "harmonic",
  "phase": "pause"
}
```

---

## 🌬 Breath Dynamics

- **Inhale** → forward/ascending language (“Gift of …”).  
- **Exhale** → expansive/inclusive language (“… within …”).  
- **Pause** → contemplative language (“The Crown of …”).  

---

## 🎨 Display Modes

- **SeedPhraseOverlay**: fades in/out over the card.  
- **WitnessRadar**: optional arc inscription.  
- **LoreArchiveView**: persistent scrollback list.  

---

## 🧪 Testing Notes

- Golden fixture table: input → expected template id.  
- Ensure templates obey breath phase rules.  
- Edge: multiple tokens may match → randomise but keep axis affinity bias.  
- Replay coherence outcomes for deterministic regression testing.  

---

## 🔗 Related Docs

- [SemanticField.md](./SemanticField.md)  
- [PhraseTemplates.md](./PhraseTemplates.md)  
- [FocusVessel.md](./FocusVessel.md)  
- [CoherenceEngine.md](./CoherenceEngine.md)  
- *(Planned)* SeedPhraseOverlay.md, LoreArchiveView.md  

---
