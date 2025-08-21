export interface ChamberManifest { id:string; name:string; version:string; description:string; tags?:string[]; thumbnail?:string; }
export interface ChamberMountOpts { root:HTMLElement; size:{width:number;height:number}; debug?:boolean; }
export interface Chamber { manifest:ChamberManifest; mount(opts:ChamberMountOpts): { unmount(): void }; }
