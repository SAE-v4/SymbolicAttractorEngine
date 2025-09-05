// src/dev/DebugHUD.ts
export interface HUDState {
  time: number;
  dt: number;
  clock: { day01: number; phase: string };
  breath: { value: number; isExhaling: boolean };
  gaze: { vx: number; vy: number };
  dpr?: number;
  size?: { w: number; h: number };
  mode?: string;
  activeGestalts?: string[];
  effects?: Record<string, unknown>;
}

export class DebugHUD {
  private el: HTMLDivElement | null = null;
  private fpsMA = 0;

  attach(container: ShadowRoot | HTMLElement) {
    if (this.el) return;
    const root = container instanceof ShadowRoot ? container : container;
    const div = document.createElement("div");
    div.id = "dev-hud";
    Object.assign(div.style, {
      position: "absolute",
      left: "8px",
      top: "8px",
      padding: "8px 10px",
      font: "12px system-ui, -apple-system, Segoe UI, sans-serif",
      color: "#cfe5ff",
      background: "rgba(10,20,40,0.55)",
      border: "1px solid rgba(140,170,220,0.35)",
      borderRadius: "8px",
      pointerEvents: "none",
      whiteSpace: "pre",
      zIndex: "10",
      backdropFilter: "blur(4px)"
    } as CSSStyleDeclaration);
    root.appendChild(div);
    this.el = div;
  }

  setVisible(v: boolean) {
    if (!this.el) return;
    this.el.style.display = v ? "block" : "none";
  }

  toggle() {
    if (!this.el) return;
    this.setVisible(this.el.style.display === "none");
  }

  update(s: HUDState) {
    if (!this.el) return;
    const fps = s.dt > 0 ? 1 / s.dt : 0;
    this.fpsMA = this.fpsMA ? (this.fpsMA * 0.9 + fps * 0.1) : fps;

    const { phase, day01 } = s.clock;
    const b = s.breath;
    const g = s.gaze;
    const w = s.size?.w ?? 0;
    const h = s.size?.h ?? 0;
    const dpr = s.dpr ?? (globalThis.devicePixelRatio || 1);

    const gest = (s.activeGestalts && s.activeGestalts.length)
      ? s.activeGestalts.join(", ")
      : "—";

    const effStr = s.effects
      ? Object.entries(s.effects)
          .map(([k, v]) => `${k}:${typeof v === "number" ? (v as number).toFixed(2) : String(v)}`)
          .join(" ")
      : "";

    this.el.textContent =
`mode: ${s.mode ?? "—"}   fps: ${this.fpsMA.toFixed(0)}
phase: ${phase.padEnd(5)}   day01: ${day01.toFixed(2)}
breath: ${b.value.toFixed(2)} ${b.isExhaling ? "⇢ exhale" : "↤ inhale"}
gaze: (${g.vx.toFixed(2)}, ${g.vy.toFixed(2)})
size: ${w}×${h}   dpr: ${dpr.toFixed(2)}
gestalts: ${gest}
effects: ${effStr}`;
  }

  destroy() {
    this.el?.remove();
    this.el = null;
  }
}
