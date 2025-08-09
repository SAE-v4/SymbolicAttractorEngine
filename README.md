# Symbolic Attractor Engine (v4)

A tiny, modular engine for “chambers” where glyphs, vectors, and cycles (day/night, seasons) interact — with a Web Audio layer for lyrical/tonal feedback.

## What’s here (v4 demo)

- Minimal EngineLoop (render + fixed update)
- A `DemoChamber` with a Sun/Moon phase and a pulse
- Web Audio engine with a click/pulse scheduler synced to engine phase
- Phone-friendly controls: Start Audio, Pause/Resume, BPM

## Quick start

```bash
npm i
npm run dev
```

## Project Layout

```
├─ index.html
├─ src/
│  ├─ main.ts
│  ├─ styles.css
│  ├─ engine/EngineLoop.ts
│  ├─ audio/AudioEngine.ts
│  └─ chambers/demo/DemoChamber.ts
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

### Roadmap (short)

- 🎚️ Audio: envelopes, mixers, buses, per-chamber motifs
- 🌗 Time: annual cycle + observatory views
- 🐝 UI: Bee avatar + gaze interactions
- 🔧 Tests + examples folder
