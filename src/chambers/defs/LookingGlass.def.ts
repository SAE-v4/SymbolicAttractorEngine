// src/chambers/defs/lookingGlass.def.ts
import { ChamberDefinition } from "../core/defs";

export const lookingGlassDef: ChamberDefinition = {
  id: "looking-glass",
  title: "Looking Glass",
  visuals: [
    { kind:"bgGradient", dayNight:true },
    { kind:"mirrorLine", emphasis:"armed" },
    { kind:"witness", eyeGlow:true },
  ],
  rules: [
    { kind:"mirror", axis:"vertical", flipOnBeats:[0,0.25,0.5,0.75], controlMirror:"right", armedOnCross:true },
    { kind:"gazeAlign", target:"mirrorSelf", toleranceDeg:18, flashScale:0.45 },
    { kind:"pulse", thresholds:[0,0.25,0.5,0.75], onBeat:"sparkle" }
  ],
  params:{ phaseSpeedPerBpm: 1/240 }
};
