export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  dpr = Math.min(devicePixelRatio || 1, 2)
) {
  const { clientWidth, clientHeight } = canvas;
  const width  = Math.max(1, Math.floor(clientWidth  * dpr));
  const height = Math.max(1, Math.floor(clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d") as any;
    if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  return false;
}
