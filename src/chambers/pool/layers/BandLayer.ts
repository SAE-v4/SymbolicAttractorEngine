// src/chambers/pool/layers/BandLayer.ts
import { resolveTheme, type ThemeKey } from "@/systems/bands/BandTheme";
import type { Lens, BreathSample, BreathPhase, BandInputs, BandChannels } from "@/systems/bands/BandTypes";
import { drawBandPair } from "@/systems/bands/BandRenderer2D";
import { Lag } from "@chambers/pool/systems/Lag";
import { dayShading } from "@/systems/bands/MesoShading"; // <-- also fixes dayShading undefined
import type { DayPhase } from "@/types";

export class BandLayer {
  private w = 1; private h = 1;
  private lastVal = 0; private lastPhase: BreathPhase = "exhale";
  private preview: "both" | "shadow" | "light" = "both";
  setTheme(k: ThemeKey) { this.themeKey = k; }
  setPreview(p: "both" | "shadow" | "light") { this.preview = p; }

  private themeKey: ThemeKey = "normal";


  // smoothing
  private lagSpacing = new Lag(0.18, 28);
  private lagThick = new Lag(0.14, 14);
  private lagLead = new Lag(0.10, 0);
  private lagLag = new Lag(0.10, 0);
  private lagAlphaS = new Lag(0.10, 0.3);
  private lagAlphaL = new Lag(0.10, 0.3);

  // hud metrics
  private metrics = { spacing: 0, thick: 0, lead: 0, lag: 0, alphaShadow: 0, alphaLight: 0 };
  getMetrics() { return this.metrics; }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  disturb(_k: "trace-spiral" | "trace-zigzag" | "tap-hold", _x: number, _y: number, _s: number, _d?: "cw" | "ccw") { }

  draw(
    g: CanvasRenderingContext2D,
    lens: Lens,
    breath: BreathSample,
    glimmer: number,
    macroHue: number,
    dt: number,
    day01: number,           // <-- NEW
    dayPhase: DayPhase       // <-- NEW
  ) {
    const inputs = { breath, day01, dayPhase, lens } as BandInputs;
    const theme = resolveTheme(this.themeKey);
    const chans: BandChannels = theme.channels(inputs);

    // base wash (very light vertical shade only for non-test themes if you want)
    g.save();
    g.fillStyle = theme.fill ? theme.fill(inputs) : chans.fill;
    g.fillRect(0, 0, this.w, this.h);
    g.restore();

    // derive raw targets
    const dv = breath.value - this.lastVal; this.lastVal = breath.value;
    const speed = Math.min(1, Math.abs(dv) * 6);
    const t = (breath.value + 1) * 0.5;

    const base = lens === "observatory" ? 26 : lens === "witness" ? 34 : lens === "organ" ? 22 : 24;
    const amp = lens === "witness" ? 10 : 8;

    const spacingTarget = base + amp * (t - 0.5);
    const thickTarget = spacingTarget * 0.48;

    const dir = breath.phase === "exhale" ? +1 : breath.phase === "inhale" ? -1 : 0;
    const leadTarget = dir * thickTarget * 0.18;
    const lagTarget = -leadTarget * 0.5;

    const isPause = breath.phase === "pause";
    const thickP = isPause ? (thickTarget + spacingTarget * 0.04) : thickTarget;
    const leadP = isPause ? 0 : leadTarget;
    const lagP = isPause ? 0 : lagTarget;

    // smooth
    const spacing = this.lagSpacing.step(spacingTarget, dt);
    const thick = this.lagThick.step(thickP, dt);
    const lead = this.lagLead.step(leadP, dt);
    const lag = this.lagLag.step(lagP, dt);

    // micro alpha envelope
    const baseShadow = 0.22, baseLight = 0.28;
    const phaseLiftS = breath.phase === "pause" ? 0.10 : breath.phase === "exhale" ? 0.06 : 0;
    const phaseLiftL = breath.phase === "pause" ? 0.06 : breath.phase === "inhale" ? 0.05 : 0;
    const rawS = baseShadow + 0.18 * speed + 0.10 * glimmer + phaseLiftS;
    const rawL = baseLight + 0.12 * speed + 0.12 * glimmer + phaseLiftL;

    // meso modulation (optional, wire proper day01/phase if desired)
    const { alphaMul } = dayShading(day01, dayPhase);
    const aS = this.lagAlphaS.step(rawS * alphaMul, dt);
    const aL = this.lagAlphaL.step(rawL * alphaMul, dt);

    const alpha = {
      shadow: this.preview === "light" ? 0 : aS,
      light: this.preview === "shadow" ? 0 : aL,
    };

    // softness + paint
    const softness = 0.60 - 0.22 * glimmer;
    const feather = 1.2;

    for (let y = 0; y < this.h + spacing; y += spacing) {
      drawBandPair(g, {
        x: 0, y, w: this.w,
        spacing, thick, lead, lag,
        softness, feather,
        colors: { ...chans },
        alpha,                                // <-- use preview-aware alpha
      });
    }

    this.metrics = { spacing, thick, lead, lag, alphaShadow: aS, alphaLight: aL };
    this.lastPhase = breath.phase;
  }
}
