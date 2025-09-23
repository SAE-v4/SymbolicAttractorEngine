export type Point = { x: number; y: number; t: number }; // px, seconds
export type Trace = Point[];

export type IntentKind =
  | "spiral"
  | "zigzag"
  | "tap"
  | "hold"
  | "flick";

export type SpiralIntent = {
  kind: "spiral";
  dir: "cw" | "ccw";
  laps: number;
  center: { x: number; y: number };   // px in local element space
  radius: number;                     // px
  confidence: number;                 // 0..1
};

export type ZigzagIntent = {
  kind: "zigzag";
  axis: "x" | "y";
  oscillations: number;
  amplitude: number;                  // px
  confidence: number;
};

export type TapIntent = {
  kind: "tap" | "hold";
  pos: { x: number; y: number };
  duration: number;                   // s
  confidence: number;
};

export type Intent = SpiralIntent | ZigzagIntent | TapIntent /* | FlickIntent */;
