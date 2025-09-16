# LoreArchiveView — Card Chamber

📍 Location: `src/docs/chambers/card/LoreArchiveView.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose

**LoreArchiveView** is a lightweight, persistent list of phrases emitted during a session.  
It complements the ephemeral [SeedPhraseOverlay](./SeedPhraseOverlay.md) by providing a scrollable history the user can review.

---

## 🧠 Principles

- **Non‑intrusive**: hidden by default; opens as a drawer or side panel.  
- **Session‑scoped**: persists until reload; later, optional save/export.  
- **Searchable** (later): filter by token, glyph, or outcome.  
- **Symbolic breadcrumbs**: small glyph icons alongside text.

---

## 🧱 UI Pattern

- **Drawer** (preferred): slides from right/left; dim background slightly.  
- **Panel**: docked sidebar for desktop; overlay on mobile.  
- **Item card** (per phrase):  
  - Glyph icon(s) (SVG `<use>`), colored via `Palette`.  
  - Text phrase.  
  - Small meta row: outcome icon (accept/harmonic), breath phase dot, timestamp.

---

## 📑 Data Model

```ts
export interface ArchiveItem {
  id: string;                 // template id or hash
  text: string;
  tokens: string[];
  glyphs: GlyphId[];
  outcome: OutcomeKind;
  phase: BreathPhase;
  t: number;                  // ms since start
}

export interface LoreArchiveView {
  open(): void;
  close(): void;
  toggle(): void;
  add(item: ArchiveItem): void;
  list(): ArchiveItem[];
  clear(): void;
}
```

Indexing: keep a simple in‑memory array; consider capped length (e.g., 200).

---

## 🔔 Triggers & Events

- Open/close via **keyboard** (e.g., `L`), **button**, or **gesture** (two‑finger swipe).  
- Auto‑open on **first harmonic** outcome (configurable).  
- Emits `archive:open`, `archive:add`, `archive:clear` (for analytics/debug).

---

## 🎨 Styling

- Typography matches overlay; smaller scale (12–14 px).  
- Row height ≈ 28–36 px; comfortable tap targets on mobile.  
- Soft separators; subtle selection highlight.  
- Respect chamber palette; ensure text contrast AA+.

---

## 🧪 Testing

- Add 1k items (synthetic) and test scroll perf on mid‑range devices.  
- Verify correct glyph icons and palette mapping.  
- Ensure state survives window resize / orientation changes.

---

## 🔗 Related

- [DialogueSystem.md](./DialogueSystem.md)  
- [SeedPhraseOverlay.md](./SeedPhraseOverlay.md)  
- [CardLayoutChamber.md](./CardLayoutChamber.md)

---
