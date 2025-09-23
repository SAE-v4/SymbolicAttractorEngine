// src/chambers/card/renderers/SvgSprite.ts
export function ensureSprite(root: ShadowRoot | Document = document) {
  const SPRITE_ID = "sae-card-sprite";
  if ((root as any).getElementById?.(SPRITE_ID)) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("id", SPRITE_ID);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  const defs = document.createElementNS(svgNS, "defs");

  // HEART
  let sym = document.createElementNS(svgNS, "symbol");
  sym.setAttribute("id", "g-heart");
  sym.setAttribute("viewBox", "0 0 100 100");
  sym.innerHTML = `<path d="M50 83C31 69 15 56 15 39a18 18 0 0 1 33-10
                   A18 18 0 0 1 85 39c0 17-16 30-35 44Z"
                   fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>`;
  defs.appendChild(sym);

  // SPIRAL
  sym = document.createElementNS(svgNS, "symbol");
  sym.setAttribute("id", "g-spiral");
  sym.setAttribute("viewBox", "0 0 100 100");
  sym.innerHTML = `<path d="M50,50 m0,-30 a30,30 0 1,1 -21.2,8.8
                   c-7.8,-7.8 -7.8,-20.5 0,-28.3 7.8,-7.8 20.5,-7.8 28.3,0
                   7.8,7.8 7.8,20.5 0,28.3" fill="none" stroke="currentColor" stroke-width="5"
                   stroke-linecap="round"/>`;
  defs.appendChild(sym);

  // ZIGZAG
  sym = document.createElementNS(svgNS, "symbol");
  sym.setAttribute("id", "g-zigzag");
  sym.setAttribute("viewBox", "0 0 100 100");
  sym.innerHTML = `<polyline points="20,25 45,45 30,60 55,75 40,90"
                   fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" />`;
  defs.appendChild(sym);

  svg.appendChild(defs);

  // Note: place the sprite in the *shadow root* of the consumer (best encapsulation)
  // If root is a ShadowRoot, append there; otherwise append to document.body
  if (root instanceof ShadowRoot) {
    root.appendChild(svg);
  } else {
    document.body.appendChild(svg);
  }
}
