// it makes room: a garden of eight. once it's full the oldest wears a small ink stitch, and the next planting sends
// it a moment later: it unpicks, newest stitch first. the real garden holds 40 (24 on a phone) and waits much
// longer before it tidies; this one is small and quick so you can see it happen
import { createBed } from './bed';
import { feel } from '../../../../js/feel.js';
import { SEEDS } from './room-seeds';

const CAP = 8;

export function mount(el: HTMLElement) {
  const stage = el.querySelector<HTMLElement>('.ro')!;
  const hint = el.querySelector('.dm-hint')!;
  const btn = el.querySelector<HTMLButtonElement>('[data-plant]')!;
  const nOut = el.querySelector('[data-n]')!;
  const meter = [...el.querySelectorAll<HTMLElement>('.ro-meter i')];
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const bed = createBed(canvas);
  let tidyT = 0;

  const paint = () => {
    const n = bed.live.length;
    nOut.textContent = String(Math.min(n, CAP));
    meter.forEach((m, i) => { m.classList.toggle('on', i < n); m.classList.toggle('go', n >= CAP && i === 0); });
    bed.mark(n >= CAP ? bed.oldest() : null);
  };
  function tidy() {
    clearTimeout(tidyT);
    if (bed.live.length <= CAP) return;
    tidyT = window.setTimeout(() => { const o = bed.oldest(); if (o) bed.unpick(o); paint(); tidy(); }, 1400);
  }
  function plant(x: number, y: number) {
    const f = bed.plant(x, y);
    feel.plant(1, x, { id: `ro${f.id}`, kind: f.kind });
    hint.classList.add('gone');
    paint(); tidy();
  }
  // somewhere that isn't already taken, for the button
  function somewhere() {
    const [w, h] = bed.size();
    let best = [w / 2, h * .4], far = -1;
    for (let i = 0; i < 40; i++) {
      const x = 30 + Math.random() * (w - 60), y = h * .2 + Math.random() * h * .3;
      const d = Math.min(Infinity, ...bed.live.map((f) => Math.hypot(f.gx * bed.cell - x, (f.gy * bed.cell - y) * 1.4)));
      if (d > far) { far = d; best = [x, y]; }
    }
    plant(best[0], best[1]);
  }

  stage.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    if (e.pointerType === 'mouse') plant(e.clientX - r.left, e.clientY - r.top);
    else {
      // a finger plants as it lifts, and only if it didn't move: the same rule as the garden
      const sx = e.clientX, sy = e.clientY;
      stage.addEventListener('pointerup', (u) => { if (Math.hypot(u.clientX - sx, u.clientY - sy) < 12) plant(u.clientX - r.left, u.clientY - r.top); }, { once: true });
    }
  });
  btn.disabled = false;
  btn.addEventListener('click', somewhere);
  // the five it opens with, already grown, where the drawing has them
  function seed() {
    const [w, h] = bed.size();
    for (const [kind, s, form, pal, x, y] of SEEDS) bed.plant(x / 100 * w, y / 100 * h, kind, { seed: s, form, pal, instant: true });
  }
  seed();
  paint();
  return { reset: () => { clearTimeout(tidyT); bed.clear(); seed(); paint(); hint.classList.remove('gone'); } };
}
