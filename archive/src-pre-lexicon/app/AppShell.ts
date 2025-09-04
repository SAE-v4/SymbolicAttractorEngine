import { CHAMBERS } from '@chambers/registry';
export function startApp(root: HTMLElement) {
  const q = new URLSearchParams(location.search);
  const pick = q.get('ch') || localStorage.getItem('sae.lastChamber') || CHAMBERS[0].manifest.id;
  const ch = CHAMBERS.find(c=>c.manifest.id===pick) || CHAMBERS[0];
  localStorage.setItem('sae.lastChamber', ch.manifest.id);
  const un = ch.mount({ root, size:{width:root.clientWidth, height:root.clientHeight}, debug:q.get('debug')==='1' });
  return () => un.unmount();
}
