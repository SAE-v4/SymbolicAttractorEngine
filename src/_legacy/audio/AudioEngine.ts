export class AudioEngine {
  private ctx: AudioContext | null = null;
  private outGain: GainNode | null = null;

  // scheduling
  private lookAhead = 0.1;    // seconds to look ahead
  private scheduleInterval = 25; // ms timer
  private nextNoteTime = 0;   // in ctx time
  private isRunning = false;
  private timerId: number | null = null;

  // tempo
  private bpm = 90;
  private beatDur = 60 / this.bpm;

  async start() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.outGain = this.ctx.createGain();
    this.outGain.gain.value = 0.2;
    this.outGain.connect(this.ctx.destination);
    this.nextNoteTime = this.ctx.currentTime + 0.05;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    this.beatDur = 60 / bpm;
  }

  pause() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }

  startScheduler(onBeat?: (t: number) => void) {
    if (!this.ctx || this.isRunning) return;
    this.isRunning = true;
    const tick = () => {
      if (!this.ctx || !this.isRunning) return;
      const currentTime = this.ctx.currentTime;
      while (this.nextNoteTime < currentTime + this.lookAhead) {
        this.triggerClick(this.nextNoteTime);
        onBeat?.(this.nextNoteTime);
        this.nextNoteTime += this.beatDur;
      }
      this.timerId = window.setTimeout(tick, this.scheduleInterval);
    };
    tick();
  }

  stopScheduler() {
    this.isRunning = false;
    if (this.timerId) window.clearTimeout(this.timerId);
  }

  // a tiny percussive blip (replace with nicer synth later)
  private triggerClick(when: number) {
    if (!this.ctx || !this.outGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.4, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);

    osc.connect(gain).connect(this.outGain);
    osc.start(when);
    osc.stop(when + 0.12);
  }
}
