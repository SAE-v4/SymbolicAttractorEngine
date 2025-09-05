import { resizeCanvasToDisplaySize } from "@/utils/canvas";
import { loadVocab, getVocab } from "@/symbolic-ui/vocab";
import vocabJson from "@/symbolic-ui/vocab/symbolic-ui.vocab.json";
import { Observatory } from "@/symbolic-ui/observatory/Observatory";
import { UICanvas2D } from "./layers/UICanvas2D";
import { SkyGL } from "./layers/SkyGL";
import type { DayPhase } from "@/symbolic-ui/vocab/types";

export class LexiconChamber {
  private skyLayer: SkyGL;
  private uiLayer: UICanvas2D;
  private observatory: Observatory;
  private lastPhase: DayPhase = "day";
  private lastActiveGestalts: string[] = [];
  private lastEffects: Record<string, unknown> = {};

  constructor(
    private skyCanvas: HTMLCanvasElement,
    private uiCanvas: HTMLCanvasElement
  ) {
    loadVocab(vocabJson);
    this.observatory = new Observatory(getVocab());
    this.skyLayer = new SkyGL(skyCanvas);
    this.uiLayer = new UICanvas2D(uiCanvas);
    this.onResize();
    new ResizeObserver(() => this.onResize()).observe(this.uiCanvas);
  }

  tick(detail: {
    time: number; dt: number;
    clock: { day01: number; phase: any };
    breath: { value: number; isExhaling: boolean };
    gaze: { vx: number; vy: number };
  }) {
    const { day01, phase } = detail.clock;

    const { active, effects } = this.observatory.resolve(phase);
    this.lastPhase = phase;
    this.lastActiveGestalts = active.map(a => a.id);
    this.lastEffects = effects ?? {};

    this.skyLayer.draw(day01);
    const phrases = getVocab().phrases ?? [];
    this.uiLayer.draw(phrases, detail.breath.value, detail.gaze);
  }

  private onResize() {
    resizeCanvasToDisplaySize(this.skyCanvas);
    resizeCanvasToDisplaySize(this.uiCanvas);
  }  
  
  resize() {}

  dispose() {}

   // 🔎 Debug snapshot for HUD
  getDebugSnapshot() {
    return {
      phase: this.lastPhase,
      activeGestalts: this.lastActiveGestalts,
      effects: this.lastEffects
    };
  }
}
