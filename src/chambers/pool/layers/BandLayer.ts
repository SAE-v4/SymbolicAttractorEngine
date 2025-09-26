// src/chambers/pool/layers/BandLayer.ts
import { Palette } from "@/systems/color/Palette";
import { drawBandPair } from "./drawBandPair";
import type { Lens } from "@/types";
import type { BreathSample, BreathPhase } from "@/types";
import { Lag } from "@chambers/pool/systems/Lag";

export class BandLayer {
  private w = 1; private h = 1;
  private lastVal = 0;
  private lastPhase: BreathPhase = "exhale";

  // debug + palette toggle remain as you have them …
  private useTestPalette = false;
  enableTestPalette(on:boolean){ this.useTestPalette = on; }

  // smoothed parameters
  private lagSpacing = new Lag(0.18, 28);
  private lagThick   = new Lag(0.14, 14);
  private lagLead    = new Lag(0.10, 0);
  private lagLag     = new Lag(0.10, 0);
  private lagAlphaS  = new Lag(0.10, 0.3);
  private lagAlphaL  = new Lag(0.10, 0.3);

  // metrics for HUD
  private metrics = { spacing:0, thick:0, lead:0, lag:0, alphaShadow:0, alphaLight:0 };
  getMetrics(){ return this.metrics; }

  resize(w:number,h:number){ this.w=w; this.h=h; }

  disturb(_kind:"trace-spiral"|"trace-zigzag"|"tap-hold", _x:number,_y:number,_s:number,_d?: "cw"|"ccw"){ /* later */ }

  private alphaEnvelope(breath: BreathSample, speed: number, glimmer: number) {
    const baseShadow = 0.22, baseLight = 0.28;
    const phaseLiftShadow = breath.phase === "pause" ? 0.10 : breath.phase === "exhale" ? 0.06 : 0.00;
    const phaseLiftLight  = breath.phase === "pause" ? 0.06 : breath.phase === "inhale" ? 0.05 : 0.00;
    const shadow = baseShadow + 0.18*speed + 0.10*glimmer + phaseLiftShadow;
    const light  = baseLight  + 0.12*speed + 0.12*glimmer + phaseLiftLight;
    return { shadow: Math.min(0.85, shadow), light: Math.min(0.90, light) };
  }

  draw(
    g: CanvasRenderingContext2D,
    lens: Lens,
    breath: BreathSample,
    glimmer: number,
    macroHue: number,
    dt: number = 1/60                   // NEW: dt for smoothing
  ){
    // palette
    const fill = this.useTestPalette ? "oklch(24% 0.02 240)" : Palette.bandFill(breath, lens, macroHue);
    const channels = this.useTestPalette
      ? { shadow: "oklch(36% 0.02 240)", light: "oklch(80% 0.04 85)" }
      : Palette.bandChannels(breath, lens, macroHue);
    const { shadow, light } = channels;

    // base wash + depth wash (same as before)
    g.save();
    g.fillStyle = fill; g.fillRect(0, 0, this.w, this.h);
    const shade = g.createLinearGradient(0, 0, 0, this.h);
    shade.addColorStop(0, "rgba(0,0,0,0.10)");
    shade.addColorStop(1, "rgba(255,255,255,0.06)");
    g.globalAlpha = 0.20 + 0.10 * glimmer;
    g.fillStyle = shade; g.fillRect(0, 0, this.w, this.h);
    g.restore();

    // --- derive raw targets ---
    const dv = breath.value - this.lastVal; this.lastVal = breath.value;
    const speed = Math.min(1, Math.abs(dv) * 6);
    const t = 0.5 * (breath.value + 1);

    const base = lens === "observatory" ? 26 : lens === "witness" ? 34 : lens === "organ" ? 22 : 24;
    const amp  = lens === "witness" ? 10 : 8;
    const spacingTarget = base + amp * (t - 0.5);
    const thickTarget   = spacingTarget * 0.48;

    const dir = breath.phase === "exhale" ? +1 : breath.phase === "inhale" ? -1 : 0;
    const leadTarget = dir * thickTarget * 0.18;
    const lagTarget  = -leadTarget * 0.5;

    const isPause = breath.phase === "pause";
    const thickPause = isPause ? (thickTarget + spacingTarget * 0.04) : thickTarget;
    const leadPause  = isPause ? 0 : leadTarget;
    const lagPause   = isPause ? 0 : lagTarget;

    // --- smooth all the things ---
    const spacing = this.lagSpacing.step(spacingTarget, dt);
    const thick   = this.lagThick.step(thickPause, dt);
    const lead    = this.lagLead.step(leadPause, dt);
    const lagV    = this.lagLag.step(lagPause, dt);

    const alphaRaw = this.alphaEnvelope(breath, speed, glimmer);
    const aS = this.lagAlphaS.step(alphaRaw.shadow, dt);
    const aL = this.lagAlphaL.step(alphaRaw.light, dt);

    // softness still tied to glimmer (brief sharpen), leave unsmoothed
    const softness = 0.60 - 0.22 * glimmer;

    // paint
    for (let y = 0; y < this.h + spacing; y += spacing) {
      drawBandPair({
        g, x: 0, y, w: this.w,
        spacing, thick,
        lead, lag: lagV,
        softness,
        colors: { shadow, light },
        alpha: { shadow: aS, light: aL },
        feather: 1.5,
      });
    }

    // HUD metrics
    this.metrics = { spacing, thick, lead, lag: lagV, alphaShadow: aS, alphaLight: aL };
    this.lastPhase = breath.phase;
  }
}
