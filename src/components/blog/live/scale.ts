// the scale header: five pads, one note of D major pentatonic each, the octave the garden plays in. the 1–5 keys play
// them too, while the header has focus
import { note } from '../synth';
import { wireSound } from './sound';

export function mount(fig: HTMLElement) {
  const pads = [...fig.querySelectorAll<HTMLButtonElement>('.sc-pad')];
  const play = (b: HTMLButtonElement) => {
    const i = +b.dataset.deg!;
    note(+b.dataset.midi!, { pan: (i - 2) * .3 });
    // restart the hop even on a quick second tap
    b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
    clearTimeout(+(b.dataset.t || 0));
    b.dataset.t = String(setTimeout(() => b.classList.remove('hit'), 360));
  };
  pads.forEach((b) => {
    b.disabled = false;
    b.addEventListener('pointerdown', (e) => { if (e.isPrimary && e.button === 0) play(b); });
    // a key press arrives as a click with no pointer
    b.addEventListener('click', (e) => { if (e.detail === 0) play(b); });  });
  fig.addEventListener('keydown', (e) => {
    const b = pads[+e.key - 1];
    if (b && !e.metaKey && !e.ctrlKey && !e.altKey) { play(b); b.focus(); }
  });
  wireSound(fig.querySelector('[data-sound]'));
}
