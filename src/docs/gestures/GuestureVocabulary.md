# Gesture Vocabulary

This document specifies the symbolic gesture vocabulary for the Symbolic
Attractor Engine (SAE).\
Gestures are treated not only as input mechanics but also as symbolic
operators --- each with semantic weight.

------------------------------------------------------------------------

## Core Gesture Families

### 1. Spiral

-   **Form**: Continuous circular or spiral motion, clockwise (CW) or
    counter-clockwise (CCW).
-   **Symbolism**: Expansion/contraction of thought; foraging paths;
    cyclic return.
-   **Variations**:
    -   Tight spirals → concentration, focus.
    -   Wide spirals → exploration, openness.
    -   Direction CW/CCW → polarity (offering vs. receiving).

### 2. Zigzag (Lightning / Pathfinding)

-   **Form**: Sharp angular strokes, left-right or up-down.
-   **Symbolism**: Sudden insight, disruption, protective warding.
-   **Variations**:
    -   Single flick → alert / signal.
    -   Repeated zigzag → barrier, energetic boundary.

### 3. Circle / Orbit

-   **Form**: Smooth closed loop.
-   **Symbolism**: Containment, wholeness, memory orbit.
-   **Variations**:
    -   Slow circle → contemplative recall.
    -   Fast circle → immediate closure or activation.

### 4. Heart (Tap & Hold)

-   **Form**: Discrete taps (short) or presses/holds (long).
-   **Symbolism**: Attention, offering, pulse of being.
-   **Variations**:
    -   Single tap → acknowledgement.
    -   Double tap → emphasis.
    -   Long hold → devotion, gift of presence.

### 5. Line / Swipe

-   **Form**: Linear stroke, horizontal or vertical.
-   **Symbolism**: Transition, passage, horizon crossing.
-   **Variations**:
    -   Horizontal swipe → lateral transition (between chambers/beings).
    -   Vertical swipe → descent/ascent gesture.

------------------------------------------------------------------------

## Gesture Layers

-   **Surface Traces**: Captured raw pointer traces; velocity,
    curvature, duration.
-   **Intent Detection**: Pattern-matching to gesture families.
-   **Symbolic Binding**: Each gesture maps to glyphs/tokens in SAE
    (e.g., Spiral → bee foraging glyph, Zigzag → witness radar arc).

------------------------------------------------------------------------

## Next Steps

-   Implement `GestureLayerEl` → emit `gesture:trace` +
    `gesture:intent`.
-   Build **Gesture Engine** to classify traces into families.
-   Align gestures with **Chamber Presences** (CardChamber) and **Field
    Dynamics** (FieldChamber).
