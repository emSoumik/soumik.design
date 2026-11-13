// a small live garden for one side of a comparison: the watercolour one (js/garden/watercolour.js, still on the home
// page behind ?garden=ink) or the pixel one (js/garden/pixels.js). each is the real module, on a canvas of its own
import { feel } from '../../../../js/feel.js';

export async function mount(el: HTMLElement) {
  const stage = el.querySelector<HTMLElement>('.mi')!;
  const hint = el.querySelector('.dm-hint')!;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const ink = stage.dataset.kind === 'ink';
  let plant: (x: number, y: number, slop: number) => void;
  if (ink) {
    const { createGarden } = await import('../../../../js/garden/watercolour.js');
    const g = createGarden(canvas, { initial: 'auto', bed: (w: number, h: number) => ({ cx: w / 2, cy: h * .55, bw: Math.min(520, w - 80), bh: Math.min(150, h * .4) }) });
    plant = (x, y) => { g.plant(x, y); feel.plant(1, x); };
  } else {
    const { createGarden } = await import('../../../../js/garden/pixels.js');
    const g = createGarden(canvas, {
      initial: 'auto',
      field: (w: number, h: number, mob: boolean) => ({ rect: [24, h * .22, w - 24, h * .6], avoid: [], n: mob ? 4 : 7 }),
      onStitch: (f: { id: number; kind: string; x: number }, part: string, p: number) => feel.stitch({ id: f.id, kind: f.kind, part, p, x: f.x }),
      onBloom: (f: { id: number; kind: string; x: number }) => feel.plant(1, f.x, { id: f.id, kind: f.kind }),
      onMorph: (f: { kind: string; x: number }, how: string) => feel.morph(how, f.x, { kind: f.kind }),
    });
    plant = (x, y, slop) => g.plant(x, y, slop);
  }
  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const [x, y] = local(e);
    hint.classList.add('gone');
    if (e.pointerType === 'mouse') { plant(x, y, 4); return; }
    const sx = e.clientX, sy = e.clientY;
    stage.addEventListener('pointerup', (u) => { if (Math.hypot(u.clientX - sx, u.clientY - sy) < 12) plant(x, y, 14); }, { once: true });
  });
}
