export class SkyGL {
  constructor(private canvas: HTMLCanvasElement) {}

  draw(day01: number) {
    const g = this.canvas.getContext("2d")!;
    const { width, height } = this.canvas;
    const grad = g.createLinearGradient(0, 0, 0, height);
    // simple day-night blend
    const t = day01;
    const top = lerpColor([10,20,50], [120,170,255], t < 0.5 ? t * 2 : (1 - t) * 2);
    const bot = lerpColor([5,5,15],  [200,220,255], t < 0.5 ? t * 2 : (1 - t) * 2);
    grad.addColorStop(0, rgb(top));
    grad.addColorStop(1, rgb(bot));
    g.fillStyle = grad;
    g.fillRect(0, 0, width, height);
  }
}

function lerp(a:number,b:number,t:number){return a+(b-a)*t;}
function lerpColor(a:[number,number,number], b:[number,number,number], t:number){
  return [lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t)] as [number,number,number];
}
function rgb(c:[number,number,number]){ return `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; }
