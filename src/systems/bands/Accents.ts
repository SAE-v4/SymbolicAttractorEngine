import type { BandChannels, BandInputs } from "./BandTypes";

// Breath bindings mirror our chamber docs (pause -> Witness/Scale). :contentReference[oaicite:1]{index=1} :contentReference[oaicite:2]{index=2}
export function computeBreathAccents(inp: BandInputs): BandChannels {
  const { phase, value, velocity } = inp.breath;
  const p = phase === "inhale" ? Math.pow(value, 0.75)
          : phase === "exhale" ? (1 - Math.pow(value, 0.85))
          : 0.65; // pause plateau

  let tiltAcc = 0, alphaAcc = 0, gradeAcc = 0, witnessAcc = 0;

  if (phase === "inhale") {
    tiltAcc   = +0.010 * p;           // slight up-tilt feel
    alphaAcc  = +0.06  * p;           // gently brighter bands
    gradeAcc  = +0.02  * p;
  } else if (phase === "exhale") {
    tiltAcc   = -0.010 * p;
    alphaAcc  = -0.05  * p;
    gradeAcc  = -0.02  * p;
  } else { // pause
    witnessAcc = 0.15 * p;            // enable curvature band
    alphaAcc   = +0.04 * p;           // brighter phase band
  }

  // micro energy from breath velocity (adds liveliness)
  const micro = Math.max(-1, Math.min(1, velocity)) * 0.02;
  gradeAcc += micro;

  // Day tints (slow drift)
  const { phase: day } = inp.day;
  const tint = dayPhaseTint(day);
  return { tiltAcc, alphaAcc, gradeAcc, witnessAcc, ...tint };
}

function dayPhaseTint(phase: "dawn"|"day"|"dusk"|"night") {
  switch (phase) {
    case "dawn":  return { tintL:+0.02, tintC:+0.01, tintH:+4 };
    case "day":   return { tintL:+0.00, tintC:+0.00, tintH:+0 };
    case "dusk":  return { tintL:-0.02, tintC:+0.02, tintH:-5 };
    case "night": return { tintL:-0.04, tintC:+0.01, tintH:+6 };
  }
}
