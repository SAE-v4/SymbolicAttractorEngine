import type { AudioConfig } from "@types/AudioConfig";

type ShimmerNodes = {
  noise: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
};

const DEFAULTS: Required<AudioConfig> = {
  enabled: true,
  audioClick: true,
  audioPad: true,
  audioWitness: true,
  pad: "spiralPad",
  chime: "spiralChime",
  masterGain: 0.8,
  padVol: 0.35,
  clickVol: 0.12,
  witnessVol: 0.45,
};

export type AudioInputs = {
  phase: number;
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  facing: { x: number; y: number };
  thrust: number;
  gate: {
    progress: number;
    sAlign: number;
    sBreath: number;
    sCoherent: number;
    coherence: number;
    justOpened?: boolean;
  };
  width: number;
  height: number;
};

export class AudioSystem {
  private cfg: Required<AudioConfig>;
  private unlocked = false;
  private ctx?: AudioContext;

  private master!: GainNode;
  private musicBus!: GainNode;
  private fxBus!: GainNode;
  private witnessBus!: GainNode;

  private pad = {
    oscA: null as OscillatorNode | null,
    oscB: null as OscillatorNode | null,
    filt: null as BiquadFilterNode | null,
    amp: null as GainNode | null,
  };

  private witness = {
    noise: null as AudioBufferSourceNode | null,
    filt: null as BiquadFilterNode | null,
    pan: null as StereoPannerNode | null,
    amp: null as GainNode | null,
    loopBuf: null as AudioBuffer | null,
  };

  private lastQuarter = -1;
  private shimmer?: ShimmerNodes;

  constructor(cfg: AudioConfig) {
    this.cfg = { ...DEFAULTS, ...cfg };
  }

  async unlock() {
    if (this.ctx) return;
    if (!this.unlocked) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      const ctx = this.ctx;

      // master & buses
      this.master = ctx.createGain();
      this.master.gain.value = this.cfg.masterGain;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 2.5;
      comp.attack.value = 0.01;
      comp.release.value = 0.2;

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.cfg.padVol;

      this.fxBus = ctx.createGain();
      this.fxBus.gain.value = this.cfg.clickVol;

      this.witnessBus = ctx.createGain();
      this.witnessBus.gain.value = this.cfg.witnessVol;

      this.musicBus.connect(this.master);
      this.fxBus.connect(this.master);
      this.witnessBus.connect(this.master);
      this.master.connect(comp);
      comp.connect(ctx.destination);

      // PAD
      if (this.cfg.audioPad) {
        const amp = ctx.createGain();
        amp.gain.value = 0.0;

        const filt = ctx.createBiquadFilter();
        filt.type = "bandpass";
        filt.frequency.value = 500;
        filt.Q.value = 0.6;

        const a = ctx.createOscillator();
        a.type = "sine";
        a.frequency.value = 220;

        const b = ctx.createOscillator();
        b.type = "sine";
        b.frequency.value = 220 * Math.pow(2, 2 / 12); // +2 st

        a.connect(amp);
        b.connect(amp);
        amp.connect(filt);
        filt.connect(this.musicBus);
        a.start();
        b.start();

        this.pad = { oscA: a, oscB: b, filt, amp };
      }

      // WITNESS
      if (this.cfg.audioWitness) {
        const loop = this.buildNoiseBuffer(ctx, 1.0);
        const src = ctx.createBufferSource();
        src.buffer = loop;
        src.loop = true;

        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass";
        filt.frequency.value = 1200;
        filt.Q.value = 0.0001;

        const pan = ctx.createStereoPanner();
        pan.pan.value = 0;

        const amp = ctx.createGain();
        amp.gain.value = 0.0;

        src.connect(filt);
        filt.connect(pan);
        pan.connect(amp);
        amp.connect(this.witnessBus);
        src.start();

        this.witness = { noise: src, filt, pan, amp, loopBuf: loop };
      }

      this.unlocked = true;
    }
  }

  update(dt: number, state: AudioInputs) {
    if (!this.cfg.enabled || !this.unlocked || !this.ctx) return;

    // --- Rhythm click on quarters
    if (this.cfg.audioClick) {
      const quarters = Math.floor(state.phase * 4 + 1e-6) % 4; // 0..3
      if (quarters !== this.lastQuarter) {
        this.lastQuarter = quarters;
        this.click(quarters === 0 ? 880 : 660, quarters === 0 ? 0.18 : 0.12);
      }
    }

    // --- PAD breath (amp + filter)
    if (this.pad.amp && this.pad.filt) {
      const breath = 0.5 + 0.5 * Math.sin(state.phase * Math.PI * 2);
      const eased = breath;

      const targetAmp = 0.08 + 0.12 * eased + 0.15 * (state.gate.progress ?? 0);
      this.smooth(this.pad.amp.gain, targetAmp, 0.15);

      const speed = Math.hypot(state.vel.x, state.vel.y);
      const bright = Math.min(1, speed / 600);
      const f =
        400 +
        1400 *
          (0.6 * eased +
            0.3 * bright +
            0.1 * (state.gate.sAlign as number | 0));
      this.smooth(this.pad.filt.frequency!, f, 0.2);
    }

    // --- Witness voice (pan/brightness/amp)
    if (this.witness.amp && this.witness.filt && this.witness.pan) {
      const nx = (state.pos.x / Math.max(1, state.width)) * 2 - 1; // -1..1
      this.smooth(this.witness.pan.pan, nx, 0.25);

      const speed = Math.hypot(state.vel.x, state.vel.y);
      const cutoff = 800 + 2600 * Math.min(1, speed / 700);
      this.smooth(this.witness.filt.frequency!, cutoff, 0.25);

      const base = 0.05 + 0.25 * state.thrust;
      const flow =
        0.2 * (0.5 * (state.gate.sAlign as number | 0) + 0.5 * (state.gate.sBreath as number | 0));
      const target = Math.min(
        0.9,
        (base + flow) * (0.6 + 0.6 * (state.gate.progress ?? 0))
      );
      this.smooth(this.witness.amp.gain, target, 0.25);
    }

    // --- Shimmer: modulated by coherence
    const coherenceProduct = state.gate.coherence ?? 0;

    if (!this.shimmer) {
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let n = 0; n < bufferSize; n++) output[n] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 4000;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;

      noise.connect(filter).connect(gain).connect(this.master);
      noise.start();

      this.shimmer = { noise, filter, gain };
    }

    this.smooth(this.shimmer.gain.gain, Math.min(0.4, coherenceProduct * 0.4), 0.2);

    // --- Gate chime
    if (state.gate.justOpened) this.chime();
  }

  private smooth(param: AudioParam, target: number, time = 0.08) {
    const now = this.ctx!.currentTime;
    param.setTargetAtTime(target, now, Math.max(0.01, time));
  }

  private click(freq = 880, vol = 0.15) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
    o.connect(g);
    g.connect(this.fxBus);
    o.start();
    o.stop(this.ctx.currentTime + 0.1);
  }

  private chime() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.7);

    [740, 880, 1175].forEach((f, idx) => {
      const o = this.ctx!.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      o.start(now + idx * 0.02);
      o.stop(now + 0.7);
    });

    g.connect(this.fxBus);
  }

  private buildNoiseBuffer(ctx: AudioContext, seconds = 1.0) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let n = 0; n < len; n++) {
      const white = Math.random() * 2 - 1;
      last = 0.98 * last + 0.02 * white;
      data[n] = last * 0.6;
    }
    return buf;
  }
}
