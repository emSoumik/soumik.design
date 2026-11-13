// idle: the home page's garden (js/garden/pixels.js), with every frame it draws counted. the garden clears its canvas
// once per frame, so counting those calls counts frames. the counter only changes when a frame is drawn, and
// "stopped" is one timer set from the last frame, so the demo does no work in between either
import { createGarden } from '../../../../js/garden/pixels.js';
import { feel } from '../../../../js/feel.js';

export function mount(el: HTMLElement) {
  const stage = el.querySelector<HTMLElement>('.id')!;
  const nOut = el.querySelector('[data-n]')!;
  const state = el.querySelector<HTMLElement>('[data-state]')!;
  const read = el.querySelector('.dm-read')!;
  const btn = el.querySelector<HTMLButtonElement>('[data-plant]')!;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);

  let frames = 0, quietT = 0;
  const ctx = canvas.getContext('2d')!;
  const clear = ctx.clearRect.bind(ctx);
  ctx.clearRect = (x: number, y: number, w: number, h: number) => {
    frames++;
    nOut.textContent = frames.toLocaleString('en');
    if (!state.hasAttribute('data-on')) { state.setAttribute('data-on', ''); state.textContent = 'drawing'; }
    clearTimeout(quietT);
    quietT = window.setTimeout(() => {
      state.removeAttribute('data-on'); state.textContent = 'stopped';
      read.textContent = `stopped at ${frames.toLocaleString('en')}. it stays there until something moves`;
    }, 250);
    clear(x, y, w, h);
  };
  const garden = createGarden(canvas, {
    initial: 'auto',
    field: (w: number, h: number, mob: boolean) => ({ rect: [24, h * .3, w - (mob ? 24 : 180), h * .62], avoid: [], n: mob ? 3 : 5 }),
    onStitch: (f: { id: number; kind: string; x: number }, part: string, p: number) => feel.stitch({ id: f.id, kind: f.kind, part, p, x: f.x }),
    onBloom: (f: { id: number; kind: string; x: number }) => feel.plant(1, f.x, { id: f.id, kind: f.kind }),
  });

  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const [x, y] = local(e);
    if (e.pointerType === 'mouse') { garden.plant(x, y, 4); return; }
    const sx = e.clientX, sy = e.clientY;
    stage.addEventListener('pointerup', (u) => { if (Math.hypot(u.clientX - sx, u.clientY - sy) < 12) garden.plant(x, y, 14); }, { once: true });
  });
  btn.disabled = false;
  btn.addEventListener('click', () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    garden.plant(30 + Math.random() * (w * .6), h * .3 + Math.random() * h * .3);
  });
  return { reset: () => { frames = 0; nOut.textContent = '0'; garden.clear(); } };
}
