
import '@/app/engine-root';


(window as any).__occOn = true; // press 'o' to toggle
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase()==='o'){ (window as any).__occOn = !(window as any).__occOn; }
});



