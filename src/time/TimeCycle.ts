// src/time/TimeCycle.ts
export class TimeCycle {
  phase = 0;
  private speed = 0.05;
  update(dt:number){ this.phase = (this.phase + this.speed*dt) % 1; }
  setSpeed(v:number){ this.speed = v; }
  getPhase(){ return this.phase; }
}
