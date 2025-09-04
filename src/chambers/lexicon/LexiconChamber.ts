import { resizeCanvasToDisplaySize } from "@/utils/canvas";
import { loadVocab, getVocab } from "@/symbolic-ui/vocab";
import vocabJson from "@/symbolic-ui/vocab/symbolic-ui.vocab.json";
import { Observatory } from "@/symbolic-ui/observatory/Observatory";
import { UICanvas2D } from "./layers/UICanvas2D";
import { SkyGL } from "./layers/SkyGL";

export class LexiconChamber {
  private skyLayer: SkyGL;
  private uiLayer: UICanvas2D;
  private observatory: Observatory;

  constructor(private skyCanvas: HTMLCanvasElement, private uiCanvas: HTMLCanvasElement) {
    loadVocab(vocabJson);
    this.observatory = new Observatory(getVocab());
    this.skyLayer = new SkyGL(skyCanvas);
    this.uiLayer  = new UICanvas2D(uiCanvas);
    this.onResize();
    new ResizeObserver(() => this.onResize()).observe(this.uiCanvas);
  }

  dispose() {}

  tick(detail: {
    time: number; dt: number;
    clock: { day01: number; phase: any };
    breath: { value: number; isExhaling: boolean };
    gaze: { vx: number; vy: number };
  }) {
    console.log("Lexicon Chamber tick")
    const { day01, phase } = detail.clock;
    const { effects } = this.observatory.resolve(phase);
    // Future: use effects.auraGain/ringPulse/ribbonWeight
    console.log(day01)
    this.skyLayer.draw(day01);
    const phrases = getVocab().phrases ?? [];
    this.uiLayer.draw(phrases, detail.breath.value, detail.gaze);
  }

  private onResize() {
    resizeCanvasToDisplaySize(this.skyCanvas);
    resizeCanvasToDisplaySize(this.uiCanvas);
  }
}
