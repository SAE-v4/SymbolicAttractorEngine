// orchestrates breath ↔ spiral ↔ witness/

import type { BreathState } from "@systems/breath/BreathRuntime";
import { OverlayCanvas } from "./spiral/OverlayCanvas";
import { genKnots, applyBreathToRadius } from "./spiral/SpiralGenerator";
import {
  spiralCfg,
  ringClock,
  travelerCfg,
  witnessCfg,
  visuals,
} from "@chambers/presets/solarPresets";
import type { Knot } from "./spiral/types";
import { genSpiralPolylinePoints } from "./spiral/SpiralGenerator";

export class SolarSpiralGateChamber {
  private overlay: OverlayCanvas;
  private knots: Knot[] = [];
  private travelerIdx = 0;
  private ringPrev = 0;
  private spiralScale = 1;
  private ribbonWidth = 1;
  private knotGlow: number[] = [];

  constructor(private overlayCanvas: HTMLCanvasElement) {
    this.overlay = new OverlayCanvas(overlayCanvas);
    this.knots = genKnots(spiralCfg);
    this.knotGlow = this.knots.map(() => 0);
  }

  update(dt: number, breath: BreathState) {
    // 1) morph spiral
    this.spiralScale = 1 + spiralCfg.breathe.scaleEpsilon * breath.breathSS;
    this.ribbonWidth = 1 + spiralCfg.breathe.widthGain * breath.breath01;

    // 2) ring radius (same units)
    const ringR = ringClock.rBase + ringClock.rGain * breath.breath01;

    // 3) gating (rising edge)
    for (let i = this.travelerIdx; i < this.knots.length; i++) {
      const rK = applyBreathToRadius(
        this.knots[i].r,
        breath.breathSS,
        spiralCfg.breathe.scaleEpsilon
      );
      if (this.ringPrev < rK && ringR >= rK) {
        this.onGate(i);
        break;
      }
    }
    this.ringPrev = ringR;

    // 4) decay glows
    for (let i = 0; i < this.knotGlow.length; i++)
      this.knotGlow[i] = Math.max(0, this.knotGlow[i] - dt * 2.2);

    // 5) draw overlay
    this.overlay.clear();

    // dense points for smooth ribbon (uses current breathSS scale)
    const pts = genSpiralPolylinePoints(
      spiralCfg,
      160, // stepsPerTurn (tweak live)
      breath.breathSS,
      spiralCfg.breathe.scaleEpsilon
    );

    // width grows with inhale (your ribbonWidth already includes breath01)
    this.overlay.drawSpiralPolyline(pts, this.ribbonWidth);

    // knots (pearls)
    for (let i = 0; i < this.knots.length; i++) {
      this.overlay.drawKnot(this.knots[i], this.spiralScale, this.knotGlow[i]);
    }

    // traveler
    const pos = this.knots[this.travelerIdx].pos;
    this.overlay.drawTraveler(pos, this.spiralScale, breath.breath01);
  }

  private onGate(i: number) {
    this.travelerIdx = Math.min(i + 1, this.knots.length - 1);
    this.knotGlow[i] = 1.0;
    // TODO: tween traveler to next knot (for now, snap)
    // TODO: audio tick / witness pop
  }
}
