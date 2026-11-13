// down vs lift, on the real garden. "plant on touch" plants where the pointer goes down and all along a drag, which is
// what a phone did with every scroll. "plant on lift" lets a drag move the soil (standing in for the page scrolling)
// and plants only when the pointer comes up within 12 px of where it went down, the way the home page does now.
// vertical swipes always go to the page (touch-action: pan-y), so this never traps a scroll
import { createGarden } from '../../../../js/garden/pixels.js';
import { feel } from '../../../../js/feel.js';

const TAP = 12, EVERY = 34;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(el: HTMLElement) {
  const stage = el.querySelector<HTMLElement>('.li')!;
  const track = el.querySelector<HTMLElement>('.li-track')!;
  const hint = el.querySelector('.dm-hint')!;
  const seg = el.querySelector<HTMLElement>('.dm-seg')!;
  const modes = [...seg.querySelectorAll<HTMLButtonElement>('button')];
  const sOut = el.querySelector('[data-s]')!, fOut = el.querySelector('[data-f]')!;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  track.append(canvas);
  const garden = createGarden(canvas, {
    initial: 0,
    onStitch: (f: { id: number; kind: string; x: number }, part: string, p: number) => feel.stitch({ id: f.id, kind: f.kind, part, p, x: f.x }),
    onBloom: (f: { id: number; kind: string; x: number }) => feel.plant(1, f.x, { id: f.id, kind: f.kind }),
  });

  let lift = false, swipes = 0, flowers = 0, pan = 0;
  let down: { id: number; x: number; y: number; pan: number; lx: number; moved: boolean } | null = null;
  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const count = () => { sOut.textContent = String(swipes); fOut.textContent = String(flowers); };
  const plant = (x: number, y: number) => {
    // keep it to the soil above the ground line
    const h = canvas.clientHeight;
    garden.plant(x, Math.max(h * .2, Math.min(h * .62, y)));
    flowers++; count(); hint.classList.add('gone');
  };
  // in lift mode the track is wider than the frame, so there's somewhere to scroll to
  const span = () => track.offsetWidth - stage.clientWidth;
  const setPan = (v: number) => { pan = v; track.style.transform = `translateX(${v}px)`; };

  stage.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0 || down) return;
    stage.classList.add('used');
    const [x, y] = local(e);
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, pan, lx: x, moved: false };
    stage.setPointerCapture(e.pointerId);
    if (!lift) plant(x, y);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x;
    if (!down.moved && Math.hypot(dx, e.clientY - down.y) > TAP) { down.moved = true; swipes++; count(); hint.classList.add('gone'); }
    if (!down.moved) return;
    if (lift) {
      // past either end the soil gives a little, then stops
      let v = down.pan + dx; const lo = -span();
      if (v > 0) v = v * .3; else if (v < lo) v = lo + (v - lo) * .3;
      setPan(v);
    } else {
      const [x, y] = local(e);
      if (Math.abs(x - down.lx) >= EVERY) { down.lx = x; plant(x, y); }
    }
  });
  const up = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    const d = down; down = null;
    if (lift) {
      if (!d.moved) { const [x, y] = local(e); plant(x, y); }
      else if (pan > 0 || pan < -span()) { if (!reduced) track.style.transition = 'transform .3s cubic-bezier(.23, 1, .32, 1)'; setPan(Math.min(0, Math.max(-span(), pan))); setTimeout(() => (track.style.transition = ''), 320); }
    }
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', (e) => { if (down?.id === e.pointerId) down = null; });

  async function setMode(l: boolean) {
    stage.classList.add('used');
    lift = l; seg.dataset.v = l ? '1' : '0';
    modes.forEach((b, i) => b.setAttribute('aria-checked', String(i === +l)));
    swipes = 0; flowers = 0; count();
    hint.classList.remove('gone');
    hint.textContent = l ? 'swipe to move the soil. tap to plant' : 'swipe sideways across the soil, then tap it';
    setPan(0);
    track.style.width = l ? '180%' : '100%';
    await garden.clear();
  }
  modes.forEach((b, i) => {
    b.disabled = false;
    b.addEventListener('click', () => setMode(!!i));
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setMode(!i); modes[+!i].focus(); } });
  });
  count();
  return { reset: () => setMode(lift) };
}
