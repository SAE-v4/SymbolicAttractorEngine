export class CanvasOverlay {
  constructor(private canvas: HTMLCanvasElement, private dpr=window.devicePixelRatio||1) {}
  resize(wCss:number,hCss:number){ this.canvas.width=wCss*this.dpr; this.canvas.height=hCss*this.dpr; }
  clear(){
    const g=this.canvas.getContext("2d", {alpha:true})!;
    g.save(); g.globalCompositeOperation="copy"; g.fillStyle="rgba(0,0,0,0)";
    g.fillRect(0,0,this.canvas.width,this.canvas.height); g.restore();
  }
  drawTrace(trace: Point[]){
    if(trace.length<2) return;
    const g=this.canvas.getContext("2d")!;
    g.save(); g.setTransform(this.dpr,0,0,this.dpr,0,0);
    g.lineJoin="round"; g.lineCap="round";
    for(let i=1;i<trace.length;i++){ const a=trace[i-1], b=trace[i];
      g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y);
      g.lineWidth=3; g.strokeStyle="rgba(255,255,255,0.9)"; g.stroke();
    }
    g.restore();
  }
}
