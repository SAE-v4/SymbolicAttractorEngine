# CardState — Finite State Machine (FSM)

📍 Location: `src/docs/chambers/card/CardState.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

**CardState** defines a minimal, testable **finite state machine** that coordinates user interaction and chamber reactions:
- Manages focus glyph selection, dragging, offering, resolving, cooldown.
- Mediates inputs from **FocusVessel** + **GestureEngine** and outputs to **BeingAura**, **WitnessRadar**, **DialogueSystem**.
- Keeps timing deterministic across breath phases.

---

## 🧭 State Diagram (conceptual)

```
        +-------+
        | Idle  |
        +---+---+
            | (pointer down on Vessel / gesture begin)
            v
       +----+-----+
       | Dragging |
       +----+-----+
            | (drop outside chest)
            |--> SnapBack ----->+
            |                    |
            | (drop in chest)    |
            v                    |
       +----+-----+              |
       | Resolving|              |
       +----+-----+              |
            | (CoherenceEngine outcome)
            | reject -> SnapBack +--> Idle
            | accept -> AcceptEffects -> Cooldown -> Idle
            | harmonic -> HarmonicEffects -> Cooldown -> Idle
```

---

## 🔢 Types (TypeScript)

```ts
export type CardPhase = "idle" | "dragging" | "resolving" | "cooldown";
export type OutcomeKind = "reject" | "accept" | "harmonic";

export interface CardContext {
  tStart: number;
  glyphId: GlyphId;                // current focus selection
  drag?: { x:number; y:number; t0:number };
  outcome?: { kind: OutcomeKind; score:number };
  cooldownMs: number;              // e.g., 250..600
}

export type CardEvent =
  | { type: "TICK"; dt:number; time:number; breath: Breath }
  | { type: "POINTER_DOWN"; x:number; y:number }
  | { type: "POINTER_MOVE"; x:number; y:number }
  | { type: "POINTER_UP"; x:number; y:number }
  | { type: "GESTURE"; effect: GestureEffect; confidence:number }
  | { type: "OFFER"; drop:{x:number;y:number} }
  | { type: "RESOLVE"; outcome: OutcomeKind; score:number }
  | { type: "SNAPBACK_DONE" }
  | { type: "COOLDOWN_DONE" }
  | { type: "SET_GLYPH"; glyphId: GlyphId };

export interface CardState {
  phase: CardPhase;
  ctx: CardContext;
}
```

---

## 🧩 Guards & Helpers

```ts
export interface Guards {
  isOnVessel(x:number,y:number): boolean;
  isInChest(x:number,y:number): boolean; // BeingAura hit test
}

export interface Effects {
  vessel: {
    startDrag(x:number,y:number): void;
    dragTo(x:number,y:number): void;
    snapBack(): void;
    cycleNext(): void;
    freeze(): void;
  };
  aura: {
    reactAccept(score:number): void;
    reactHarmonic(score:number): void;
  };
  radar: {
    ripple(kind: OutcomeKind, score:number): void;
    echoGlyph(glyphId: GlyphId, axes?: number[]): void;
  };
  audio: {
    gesture(e: GestureEffect): void;
    offer(glyph: GlyphId): void;
    receive(kind: OutcomeKind): void;
    harmonicX(): void;
  };
  dialogue: {
    emit(kind: OutcomeKind, glyphId: GlyphId, breath: Breath): void;
  };
}
```

---

## 🔀 Transition Table (core)

| From       | Event                | Guard/Notes                              | To          | Effects |
|------------|----------------------|------------------------------------------|-------------|---------|
| `idle`     | `POINTER_DOWN`       | `isOnVessel`                              | `dragging`  | `vessel.startDrag` |
| `idle`     | `GESTURE`            | update vessel speed/dir/hold             | `idle`      | `audio.gesture` |
| `dragging` | `POINTER_MOVE`       | —                                        | `dragging`  | `vessel.dragTo` |
| `dragging` | `POINTER_UP`         | `!isInChest`                             | `idle`      | `vessel.snapBack` → emit `SNAPBACK_DONE` |
| `dragging` | `POINTER_UP`         | `isInChest`                              | `resolving` | `audio.offer`; compute coherence async; dispatch `RESOLVE` |
| `resolving`| `RESOLVE(reject)`    | —                                        | `idle`      | `vessel.snapBack`; `audio.receive(reject)` |
| `resolving`| `RESOLVE(accept)`    | —                                        | `cooldown`  | `aura.reactAccept`; `radar.ripple`; `dialogue.emit` |
| `resolving`| `RESOLVE(harmonic)`  | —                                        | `cooldown`  | `aura.reactHarmonic`; `radar.ripple`; `audio.harmonicX`; `dialogue.emit` |
| `cooldown` | `COOLDOWN_DONE`      | after `cooldownMs`                       | `idle`      | `vessel.cycleNext` |

**Notes**
- Cooldown prevents immediate re‑offering spam; also lets effects play.
- Gesture events during `dragging` may still be consumed by the vessel but **should not** change selection until after resolution.

---

## 🧪 Reducer Sketch

```ts
export function reducer(state: CardState, e: CardEvent, guards: Guards, fx: Effects): CardState {
  const { phase, ctx } = state;
  switch (phase) {
    case "idle": {
      if (e.type === "POINTER_DOWN" && guards.isOnVessel(e.x,e.y)) {
        fx.vessel.startDrag(e.x,e.y);
        return { phase: "dragging", ctx: { ...ctx, drag:{x:e.x,y:e.y,t0:e.time} } };
      }
      if (e.type === "GESTURE") {
        fx.audio.gesture(e.effect); // vessel handles speed/dir/hold elsewhere
        return state;
      }
      if (e.type === "SET_GLYPH") {
        return { phase, ctx: { ...ctx, glyphId: e.glyphId } };
      }
      return state;
    }

    case "dragging": {
      if (e.type === "POINTER_MOVE") {
        fx.vessel.dragTo(e.x,e.y);
        return state;
      }
      if (e.type === "POINTER_UP") {
        if (!guards.isInChest(e.x,e.y)) {
          fx.vessel.snapBack();
          return { phase: "idle", ctx: { ...ctx, drag: undefined } };
        }
        // Offer path
        fx.audio.offer(ctx.glyphId);
        return { phase: "resolving", ctx };
      }
      return state;
    }

    case "resolving": {
      if (e.type === "RESOLVE") {
        const { outcome, score } = e;
        if (outcome === "reject") {
          fx.vessel.snapBack();
          fx.audio.receive("reject" as OutcomeKind);
          return { phase: "idle", ctx: { ...ctx, outcome:{kind:outcome, score} } };
        }
        if (outcome === "accept") {
          fx.aura.reactAccept(score);
          fx.radar.ripple("accept", score);
          fx.audio.receive("accept" as OutcomeKind);
          fx.dialogue.emit("accept", ctx.glyphId, (e as any).breath ?? {phase:"pause",value:1,velocity:0,bpm:6,tGlobal:0});
          return { phase: "cooldown", ctx: { ...ctx, tStart: e.time, outcome:{kind:outcome, score} } };
        }
        // harmonic
        fx.aura.reactHarmonic(score);
        fx.radar.ripple("harmonic", score);
        fx.audio.receive("harmonic" as OutcomeKind);
        fx.audio.harmonicX();
        fx.dialogue.emit("harmonic", ctx.glyphId, (e as any).breath ?? {phase:"pause",value:1,velocity:0,bpm:6,tGlobal:0});
        return { phase: "cooldown", ctx: { ...ctx, tStart: e.time, outcome:{kind:"harmonic", score} } };
      }
      return state;
    }

    case "cooldown": {
      if (e.type === "TICK" && (e.time - ctx.tStart) >= ctx.cooldownMs) {
        fx.vessel.cycleNext();
        return { phase: "idle", ctx: { ...ctx, outcome: undefined } };
      }
      if (e.type === "COOLDOWN_DONE") {
        fx.vessel.cycleNext();
        return { phase: "idle", ctx: { ...ctx, outcome: undefined } };
      }
      return state;
    }
  }
}
```

---

## 🧪 Testing Strategy

- **Deterministic loop**: fixed breath and time; snapshot phases after scripted events.  
- **Hit‑testing**: mock `isOnVessel`/`isInChest` to verify transitions.  
- **Outcome table**: for each outcome, ensure correct effects fire and cooldown elapsed.  
- **Spam guard**: rapid `POINTER_DOWN/UP` should not bypass resolution/cooldown.  
- **Gesture during drag**: ensure selection doesn’t change until back to `idle`.

---

## 🔗 Related

- [FocusVessel.md](./FocusVessel.md)  
- [GestureEngine.md](./GestureEngine.md)  
- [CoherenceEngine.md](./CoherenceEngine.md)  
- [BeingAura.md](./BeingAura.md)  
- [WitnessRadar.md](./WitnessRadar.md)

---
