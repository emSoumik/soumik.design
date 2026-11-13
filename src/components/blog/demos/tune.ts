// in tune: the same eight pads in two sets of notes. the garden's five (D major pentatonic, twice over) have no two
// notes a semitone apart, so nothing rubs. eight plain semitones from D have plenty. the readout names the last
// two notes and how far apart they are
import { note } from '../synth';

const SETS = [
  { midi: [74, 76, 78, 81, 83, 86, 88, 90], names: ['D', 'E', 'F♯', 'A', 'B', 'D', 'E', 'F♯'] },
  { midi: [74, 75, 76, 77, 78, 79, 80, 81], names: ['D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A'] },
];
const PENTA = new Set([2, 4, 6, 9, 11]);   // pitch classes of D E F# A B
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function mount(el: HTMLElement) {
  const pads = [...el.querySelectorAll<HTMLButtonElement>('.tu-pad')];
  const keys = [...el.querySelectorAll<HTMLElement>('.tu-keys i')];
  const seg = el.querySelector<HTMLElement>('.dm-seg')!;
  const modes = [...seg.querySelectorAll<HTMLButtonElement>('button')];
  const rand = el.querySelector<HTMLButtonElement>('[data-rand]')!;
  const read = el.querySelector('.dm-read')!;
  let set = 0, last: { m: number; t: number } | null = null, walk = 0;

  function setMode(s: number) {
    set = s; seg.dataset.v = String(s);
    modes.forEach((b, i) => b.setAttribute('aria-checked', String(i === s)));
    pads.forEach((p, i) => {
      p.querySelector('.px')!.textContent = SETS[s].names[i];
      p.classList.toggle('out', !PENTA.has(SETS[s].midi[i] % 12));
      p.setAttribute('aria-label', `Play ${SETS[s].names[i].replace('♯', ' sharp')}`);
    });
    keys.forEach((k) => k.classList.toggle('on', SETS[s].midi.includes(+k.dataset.m!)));
    read.textContent = s ? 'red ones aren’t in the garden’s scale' : 'tap the pads';
    last = null;
  }
  function hit(i: number) {
    const m = SETS[set].midi[i];
    note(m, { pan: (i - 3.5) * .18 });
    for (const el of [pads[i], keys.find((k) => +k.dataset.m! === m)]) {
      if (!el) continue;
      el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
      setTimeout(() => el.classList.remove('hit'), 160);
    }
    // two notes close enough in time to ring together
    const now = performance.now();
    if (last && last.m !== m && now - last.t < 1400) {
      const gap = Math.abs(m - last.m), [a, b] = [last.m, m].sort((x, y) => x - y);
      const rub = gap % 12 === 1 || gap % 12 === 11;
      read.innerHTML = `${NAMES[a % 12]} + ${NAMES[b % 12]} · <b>${gap} semitone${gap > 1 ? 's' : ''}</b> apart${rub ? ' · they rub' : ''}`;
    }
    last = { m, t: now };
  }

  [...pads, ...modes, rand].forEach((b) => (b.disabled = false));
  pads.forEach((p, i) => {
    p.addEventListener('pointerdown', (e) => { if (e.button === 0) hit(i); });
    // the keyboard, which clicks with no pointer
    p.addEventListener('click', (e) => { if (e.detail === 0) hit(i); });
  });
  modes.forEach((b, i) => {
    b.addEventListener('click', () => setMode(i));
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setMode(1 - i); modes[1 - i].focus(); } });
  });
  // a dozen taps, quick and uneven, the way a few people tapping at once would
  rand.addEventListener('click', () => {
    clearTimeout(walk);
    let k = 0;
    const step = () => { hit(Math.floor(Math.random() * 8)); if (++k < 12) walk = window.setTimeout(step, 110 + Math.random() * 140); };
    step();
  });
  setMode(0);
  return { reset: () => { clearTimeout(walk); setMode(0); } };
}
