# Card Layout Chamber — Vertical Slice Spec

📍 Location: `src/docs/chambers/card/CardLayoutChamber.md`

[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose
A vertical slice that demonstrates SAE’s symbolic card‑layout interaction:

- Chamber Being presented in a symbolic “card.”  
- Glyphs cycle in a focus vessel, modulated by breath.  
- User gestures (spiral, zigzag, hold) alter cycle and trigger coherence.  
- Dialogue emerges via glyphs, arcs, and sparse English words.  

This slice = a miniature but complete symbolic play loop.

---

## 📚 Document Map

- **Glyph reference** → [CardLayoutGlyphs.md](./CardLayoutGlyphs.md)
- **(Planned) Focus Vessel** → `FocusVessel.md`
- **(Planned) Gesture Engine** → `GestureEngine.md`
- **(Planned) Being Aura** → `BeingAura.md`
- **(Planned) Witness Radar** → `WitnessRadar.md`
- **(Planned) Systems & Data** → `Palette.md`, `AudioEngine.md`, `CoherenceEngine.md`, `BreathBindings.md`, `PhraseTemplates.md`, `CardState.md`, `Data.md`

---

## 🏛 Architecture

### Top‑level shape
Namespace chamber code under `src/chambers/card/` so it is self‑contained and swappable.

```text
src/
  components/
    engine-root/            # existing
    sae-chamber/            # existing
  chambers/
    card/                   # NEW
      components/           # Web components
      systems/              # Pure logic
      renderers/            # Canvas/SVG helpers
      data/                 # JSON configs (beings, glyphs, templates)
      styles/               # CSS
      index.ts              # registers <sae-card-chamber>
      mount.ts
  assets/glyphs/            # inlineable SVG defs
```

Mount example:

```html
<engine-root breath-mode="auto" breath-bpm="6">
  <sae-card-chamber></sae-card-chamber>
</engine-root>
```

---

## 🧩 Components

### Web Components
- **CardChamber.ts** — orchestrator, routes ticks & gestures.  
- **FocusVessel.ts** — cycles glyphs, drag/offer gestures.  
- **BeingAura.ts** — chest slot, aura glow, breath response.  
- **WitnessRadar.ts** — arcs + glyph echoes.  
- **SeedPhraseOverlay.ts** — ephemeral English phrases.  
- **LoreArchiveView.ts** — drawer of collected phrases.  

> Each owns its DOM/canvas; CardChamber composes them.

---

## ⚙️ Systems (logic only)

- **Palette.ts** — shared colors + breath modulation.  
- **AudioEngine.ts** — stub: `setBreath()`, `playGesture()`, `playOffer()`.  
- **GestureEngine.ts** — classify spiral / zigzag / hold.  
- **CoherenceEngine.ts** — 7‑vector model, cosine scoring, thresholds.  
- **BreathBindings.ts** — breath → scale/opacity/audio envelopes.  
- **PhraseTemplates.ts** — text templates (“Gift of X”).  
- **CardState.ts** — small FSM (idle → dragging → resolving → cooldown).  

---

## 🎨 Renderers

- **SvgSprite.ts** — inject `<defs>` with base glyphs.  
- **SvgGlyph.ts** — render `<use>` refs with transforms.  
- **CanvasRadar.ts** — witness arcs + ripples.  
- **CanvasBackground.ts** — optional gradient / shader stub.  

---

## 📂 Data

`src/chambers/card/data/`

- `beings/heart-spirit.json` → vector, phase weights, thresholds, palette.  
- `glyphs.json` → Spiral/Heart/Zigzag glyphs (id, vec, colorKey, anim, audio).  
- `templates.json` → phrase patterns.  
- `lexicon.json` → starter words + axis affinities.  

---

## 🔄 Flow

### Tick cycle
```ts
onTick({time, breath}) {
  focusVessel.applyBreath(breath);
  beingAura.applyBreath(breath);
  witnessRadar.applyBreath(breath);
  AudioEngine.setBreath(breath);
}
```

### Gesture
```ts
onGesture(g) {
  const intent = GestureEngine.classify(g.path);
  state = CardState.applyGesture(state, intent);
  witnessRadar.echoGlyph(intent.echoGlyph);
  AudioEngine.playGesture(intent.soundId);
}
```

### Offer
```ts
onOffer(drop) {
  if (!beingAura.isInChest(drop)) return focusVessel.snapBack();

  const phraseVec = CoherenceEngine.compose([state.currentGlyph], breath.value);
  const score = CoherenceEngine.score(phraseVec, being, breath.phase);
  const outcome = CoherenceEngine.resolve(score, being.thresholds);

  beingAura.react(outcome);
  witnessRadar.ripple(outcome);
  AudioEngine.playOffer(state.currentGlyph);
  AudioEngine.playReceive(outcome);

  const phraseText = PhraseTemplates.select(outcome, state.currentGlyph, being);
  seedPhraseOverlay.flash(phraseText);
  archive.add(phraseText);
  focusVessel.cycleNext();
}
```

---

## 🖼 Layering (z‑order)

1. **CanvasBackground** (optional)  
2. **BeingAura** (aura, chest slot)  
3. **WitnessRadar** (rings/arcs)  
4. **FocusVessel (SVG)**  
5. **SeedPhraseOverlay (DOM text)**  
6. **LoreArchiveView (overlay drawer)**  

---

## 🎼 Palette & Audio Stubs

- `Palette.get(key)` → base color.  
- `Palette.withBreathPhase(color, breath)` → modulated.  
- **AudioEngine** → simple sine/triad stubs now; swap richer sources later.  

---

## 🚦 Vertical Slice Roadmap

- **Stage 1** — Skeleton: CardChamber, Being, FocusVessel, WitnessRadar stub.  
- **Stage 2** — Gestures: spiral, zigzag, hold → cycle modulation.  
- **Stage 3** — Witness Radar: arcs respond to coherence.  
- **Stage 4** — Dialogue: overlay phrases + archive list.  
- **Stage 5** — Polish: palette unification, subtle audio pad + offer chime.  
