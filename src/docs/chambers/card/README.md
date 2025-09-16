# SAE — Card Layout Chamber Vertical Slice Spec

## 🎯 Purpose

A vertical slice that demonstrates the Symbolic Attractor Engine’s core principles through a card-like chamber view:
	•	Chamber Being is presented in a symbolic card layout.
	•	Glyphs cycle in a focus vessel, modulated by breath rhythm.
	•	User gestures (spiral, zigzag, tap-hold) influence the glyph cycle and create moments of harmonic coherence.
	•	Dialogue emerges via glyphs, witness radar arcs, and sparing English word phrases.

This slice should feel like a miniature but complete experience of symbolic play.


## 🏛 Architecture

### Chamber Structure
	•	Card Layout Chamber
	•	One chamber being displayed (Heart/Spirit, Light/Shadow, etc.).
	•	Witness radar arcs in the walls layer echo coherence.
	•	Glyph focus vessel in the UI layer cycles rhythmically.

### Layers (render order)
	1.	Sky: optional; gradient background (GL or flat color for slice).
	2.	Walls: concentric arcs, radar effects, occasional word glyphs.
	3.	Ground: optional — may pulse faint glyph shadows.
	4.	UI: card layout (being + focus vessel + dialogue).


## 🧩 Components

### Core
	•	engine-root → engine loop, clock, breath runtime.
	•	sae-chamber → mounts a chamber view.
	•	ChamberSystem → orchestrates layers, breath, field.

### Chamber Being
	•	Rendered in SVG (animated via breath).
	•	Each being = unique configuration of base glyphs + color palette.
	•	Response logic:
	•	Idle → cycles small gestures (subtle nod).
	•	When offered a glyph → generates response arcs or new glyphs.

### Glyphs
	•	Base set for slice: Heart ❤️, Spiral 🌀, Flame 🔥.
	•	Stored in src/data/base_glyphs.json.
	•	Rendered in SVG (renderGlyph(id, size)), animated by breath.

### Focus Vessel
	•	UI element: single glyph at center of vessel.
	•	By default: cycles glyphs with inhale/exhale.
	•	User gestures can accelerate, reverse, or hold cycle.

### Gesture Controls
	•	Spiral: accelerate cycle.
	•	Zigzag: reverse cycle.
	•	Tap+hold: Heart gesture.
	•	Gestures modulate focus glyph + can trigger harmonic coherence.

### Dialogue
	•	Glyphs on radar arcs = being’s response.
	•	English words appear sparingly in arcs or card borders.
	•	Example: “summer” and “winter” surfacing during Light/Shadow alignment.

### 📂 Directory Scaffold

'''
src/
  chambers/
    cardLayout/
      CardLayoutChamber.ts      // main chamber entry
      components/
        ChamberBeing.ts         // renders one being (SVG)
        FocusVessel.ts          // renders and cycles glyphs
        WitnessRadar.ts         // arcs + response glyphs
      systems/
        GestureSystem.ts        // handles spiral/zigzag/hold input
        DialogueSystem.ts       // maps interactions to glyph/word output
      index.ts
      mount.ts
  data/
    base_glyphs.json            // already present
    phrase_glyphs.json
    chamber_beings.json         // configs per being (axes, palette, glyphs)
  docs/
    chambers/
      CardLayoutChamber.md      // this spec, evolving into doc
'''
