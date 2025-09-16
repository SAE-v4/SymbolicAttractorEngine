# GestureEngine — Pointer Trace → Intent (7D‑aware)

📍 Location: `src/docs/chambers/card/GestureEngine.md`  
[⬅ Back to Card docs index](./README.md)

---

## 🎯 Purpose
The **GestureEngine** consumes raw pointer traces (mouse/touch) and classifies them into symbolic intents: **trace‑spiral**, **trace‑zigzag**, **tap‑hold**, (later **circle‑seal**). It emits **gesture effects** that modulate the FocusVessel’s 7D cycle and the chamber’s state.

---

## 🧱 Inputs & Outputs

**Input**  
- Stream of sampled points `{x,y,t,pressure?}` in CSS px.  
- Bounds `{width,height,dpr}`.  
- Breath hints (optional) for phase‑aware weighting.

**Output**  
- `GestureEffect` enums: `spiralBoost`, `zigFlip`, `heartHold`, `circleSeal`.  
- Confidence `0..1` and derived metrics (winding, segment variance, dwell).  
- Optional **vector accent** `dv: Partial<Vec7>` to add to `vCycle` transiently.

---

## 🧠 Classifier Overview

1) **Preprocess**: resample to fixed Δt, center and normalize scale/rotation (Procrustes‑lite).  
2) **Features**:
   - **Winding number** / total signed curvature → spiral vs non‑spiral.  
   - **Segment angle variance** → zigzag (high alternating variance).  
   - **Dwell time** & low movement → hold.  
   - **Circle fit error** (for seal) using Pratt or Taubin fit.  
3) **Decision**: thresholded scores with hysteresis + refractory windows to avoid flapping.  
4) **Emit** `GestureEffect` with `confidence` and `dv` mapping.

---

## 🔢 Types (TypeScript)

```ts
export type GestureKind = "trace-spiral" | "trace-zigzag" | "tap-hold" | "circle-seal";
export type GestureEffect = "spiralBoost" | "zigFlip" | "heartHold" | "circleSeal";

export interface TracePoint { x:number; y:number; t:number; pressure?:number; }
export interface TraceFeatures {
  len: number;                 // total arc length
  wind: number;                // signed winding (≈ turns)
  segVar: number;              // angle variance between segments
  dwell: number;               // ms within radius rHold
  circleErr?: number;          // least-squares circle fit residual
}

export interface GestureResult {
  kind: GestureKind;
  effect: GestureEffect;
  confidence: number;          // 0..1
  dv?: Partial<Vec7>;          // optional transient vector accent
}
```

---

## 🧪 Feature Computation

### Winding (spiral)
`wind = Σ atan2( cross(vi, v{i+1}), dot(vi, v{i+1}) ) / (2π)` after smoothing.  
Thresholds: `|wind| > 0.75` turn; confidence scales to 1 by 1.5 turns.

### Zigzag (alternation)
Compute segment angles `θi`, difference `Δi = π − |π − |θi − θ{i+1}||`.  
Alternating high `Δi` yields large **segVar**; add penalty for low curvature monotony.

### Hold (dwell)
Within radius `rHold` around entry, accumulate time.  
If `dwell > 250–400 ms` with low motion energy, classify as hold.

### Circle‑seal (optional)
Fit circle, use normalized residual; require `wind ≈ ±1`. Emits `circleSeal` effect.

---

## 🎛 Mapping → 7D Effects

- **spiralBoost** → `dv` boosts **Inhale** & **Scale**; slight **Heart** tilt; increases vessel speed.  
- **zigFlip** → flips vessel `dir`; injects **Flame** (action) and negative **Light** (polarity).  
- **heartHold** → reduces vessel speed; boosts **Heart** and **Witness** for stability.  
- **circleSeal** → short‑lived **Scale** emphasis; good for “Seal/Measure” interactions.

```ts
function mapGestureToDV(res: GestureResult): Partial<Vec7> | undefined {
  switch (res.effect) {
    case "spiralBoost": return { 4: +0.2, 5: +0.2, 2: +0.05 }; // Inhale, Scale, Heart
    case "zigFlip":     return { 0: -0.15, 3: +0.15 };         // Light-, Flame+
    case "heartHold":   return { 2: +0.25, 6: +0.20 };         // Heart, Witness
    case "circleSeal":  return { 5: +0.3 };                    // Scale
  }
}
```

---

## 🧰 API Sketch

```ts
class GestureEngine {
  startTrace(p: TracePoint): void;
  addPoint(p: TracePoint): void;
  endTrace(p: TracePoint): GestureResult | null;

  computeFeatures(trace: TracePoint[]): TraceFeatures;
  classify(feat: TraceFeatures): GestureResult | null;
}
```

**Realtime mode**: emit provisional results during trace for responsive visuals; confirm on end.

---

## 🧪 Testing & Tuning

- Golden traces (SVG paths → sampled) to validate classifier.  
- Synthetic noise to ensure robustness (jitter, variable speed).  
- Refractory timing to avoid rapid flip spam (`zigFlip` cooldown ≈ 120–180 ms).  
- Parameterize radii and thresholds per device DPR and pointer precision.

---

## 🔗 Related
- [FocusVessel.md](./FocusVessel.md)
- *(Planned)* CoherenceEngine.md, BeingAura.md, WitnessRadar.md
