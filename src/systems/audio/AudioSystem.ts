// systems/audio/AudioSystem.ts
export type AudioInputs = {
  phase: number;               // 0..1 from TempoEngine
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  facing: { x: number; y: number };
  thrust: number;              // 0..1
  gate: {
    progress: number;          // 0..1
    sAlign: number; sBreath: number; sCoherent: number;
    justOpened?: boolean;      // pulse hook if you have it
  };
  width: number; height: number;
};

export class AudioSystem {
  private ctx?: AudioContext;
  private master!: GainNode;
  private musicBus!: GainNode;   // pad & shimmer
  private fxBus!: GainNode;      // clicks, chimes
  private witnessBus!: GainNode; // witness voice
  private pad = { oscA: null as OscillatorNode|null, oscB: null as OscillatorNode|null, filt: null as BiquadFilterNode|null, amp: null as GainNode|null };
  private witness = { noise: null as AudioBufferSourceNode|null, filt: null as BiquadFilterNode|null, pan: null as StereoPannerNode|null, amp: null as GainNode|null, loopBuf: null as AudioBuffer|null };
  private lastQuarter = -1;

  constructor(private flags: { all: any }) {}

  /** Call on first user gesture */
  async unlock() {
    if (this.ctx) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new Ctx();
    const { ctx } = this;

    // master & buses
    this.master = ctx.createGain(); this.master.gain.value = this.flags.all.masterVol ?? 0.8;
    const comp = ctx.createDynamicsCompressor(); // light glue
    comp.threshold.value = -18; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.2;

    this.musicBus = ctx.createGain();  this.musicBus.gain.value = (this.flags.all.padVol ?? 0.35);
    this.fxBus    = ctx.createGain();  this.fxBus.gain.value = (this.flags.all.clickVol ?? 0.12);
    this.witnessBus = ctx.createGain(); this.witnessBus.gain.value = (this.flags.all.witnessVol ?? 0.45);

    this.musicBus.connect(this.master);
    this.fxBus.connect(this.master);
    this.witnessBus.connect(this.master);
    this.master.connect(comp); comp.connect(ctx.destination);

    // PAD: two detuned sines through slow filter
    if (this.flags.all.audioPad) {
      const amp = ctx.createGain(); amp.gain.value = 0.0;
      const filt = ctx.createBiquadFilter(); filt.type = "bandpass"; filt.frequency.value = 500; filt.Q.value = 0.6;
      const a = ctx.createOscillator(); a.type = "sine"; a.frequency.value = 220;
      const b = ctx.createOscillator(); b.type = "sine"; b.frequency.value = 220 * Math.pow(2, 2/12); // +2 semitones
      a.connect(amp); b.connect(amp); amp.connect(filt); filt.connect(this.musicBus);
      a.start(); b.start();
      this.pad = { oscA: a, oscB: b, filt, amp };
    }

    // WITNESS: filtered noise loop (engine-like), panned
    if (this.flags.all.audioWitness) {
      const loop = this.buildNoiseBuffer(ctx, 1.0);
      const src = ctx.createBufferSource(); src.buffer = loop; src.loop = true;
      const filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 1200; filt.Q.value = 0.0001;
      const pan = ctx.createStereoPanner(); pan.pan.value = 0;
      const amp = ctx.createGain(); amp.gain.value = 0.0;
      src.connect(filt); filt.connect(pan); pan.connect(amp); amp.connect(this.witnessBus);
      src.start();
      this.witness = { noise: src, filt, pan, amp, loopBuf: loop };
    }
  }

  /** Call every frame once unlocked */
  update(dt: number, i: AudioInputs) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // --- Rhythm click on quarters (readable but soft)
    if (this.flags.all.audioClick) {
      const quarters = Math.floor(i.phase * 4 + 1e-6) % 4; // 0..3 within bar
      if (quarters !== this.lastQuarter) {
        this.lastQuarter = quarters;
        this.click(quarters === 0 ? 880 : 660, quarters === 0 ? 0.18 : 0.12);
      }
    }

    // --- PAD breath (amplitude + filter frequency)
    if (this.pad.amp && this.pad.filt) {
      const breath = 0.5 + 0.5 * Math.sin(i.phase * Math.PI * 2);
      const eased = breath; // could curve here
      const targetAmp = 0.08 + 0.12 * eased + 0.15 * i.gate.progress; // bloom with gate
      this.smooth(this.pad.amp.gain, targetAmp, 0.15);
      // filter “opens” with breath + gate
      const speed = Math.hypot(i.vel.x, i.vel.y);
      const bright = Math.min(1, speed / 600);
      const f = 400 + 1400 * (0.6*eased + 0.3*bright + 0.1*i.gate.sAlign);
      this.smooth(this.pad.filt.frequency!, f, 0.2);
    }

    // --- Witness voice mapping (pan/brightness/amp from x/speed/thrust)
    if (this.witness.amp && this.witness.filt && this.witness.pan) {
      const nx = (i.pos.x / Math.max(1, i.width)) * 2 - 1; // -1..1
      this.smooth(this.witness.pan.pan, nx, 0.25);

      const speed = Math.hypot(i.vel.x, i.vel.y);
      const cutoff = 800 + 2600 * Math.min(1, speed / 700);
      this.smooth(this.witness.filt.frequency!, cutoff, 0.25);

      const base = 0.05 + 0.25 * i.thrust;
      const flow = 0.2 * (0.5 * i.gate.sAlign + 0.5 * i.gate.sBreath);
      const target = Math.min(0.9, (base + flow) * (0.6 + 0.6 * i.gate.progress));
      this.smooth(this.witness.amp.gain, target, 0.25);
    }

    // --- Gate chime
    if (i.gate.justOpened) this.chime();
  }

  private smooth(param: AudioParam, target: number, time = 0.08) {
    const now = this.ctx!.currentTime;
    const t = Math.max(0.01, time);
    param.setTargetAtTime(target, now, t);
  }

  private click(freq = 880, vol = 0.15) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    o.connect(g); g.connect(this.fxBus);
    o.start(); o.stop(ctx.currentTime + 0.1);
  }

  private chime() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.7);

    [740, 880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g);
      o.start(now + i * 0.02);
      o.stop(now + 0.7);
    });
    g.connect(this.fxBus);
  }

  private buildNoiseBuffer(ctx: AudioContext, seconds = 1.0) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    // pink-ish by simple filtering
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.98 * last + 0.02 * white;
      data[i] = last * 0.6;
    }
    return buf;
  }
}
