export class BreathRuntime {
  value = 0;          // 0..1
  private target = 0; // 0..1
  isExhaling = false;

  press() { this.isExhaling = true;  this.target = 1; }
  release() { this.isExhaling = false; this.target = 0.08; } // keep a floor

  tick(dt: number) {
    const k = 1.8; // response
    this.value += (this.target - this.value) * (1 - Math.exp(-k * dt));
  }
}
