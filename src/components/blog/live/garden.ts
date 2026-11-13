// the garden header: the home page's pixel garden (js/garden/pixels.js) on a canvas of its own, with its sound.
// a few flowers stitch in, a tap plants more, and it stops drawing when nothing moves. pointers work the way the
// home page does: a mouse plants as the button goes down, a finger as it lifts, so a swipe still scrolls the page
import { createGarden } from '../../../../js/garden/pixels.js';
import { feel } from '../../../../js/feel.js';
import { wireSound } from './sound';

const SLOP = { mouse: 4, touch: 14 };

export function mount(fig: HTMLElement) {
  const stage = fig.querySelector<HTMLElement>('.ph-stage')!;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const garden = createGarden(canvas, {
    initial: 'auto',
    field: (w: number, h: number, mob: boolean) => ({ rect: [24, h * .16, w - 24, h * .62], avoid: [], n: mob ? 5 : 11 }),
    onStitch: (f: { id: number; kind: string; x: number }, part: string, p: number) => feel.stitch({ id: f.id, kind: f.kind, part, p, x: f.x }),
    onBloom: (f: { id: number; kind: string; x: number }) => feel.plant(1, f.x, { id: f.id, kind: f.kind }),
    onMorph: (f: { kind: string; x: number }, how: string) => feel.morph(how, f.x, { kind: f.kind }),
    onSparkle: (ms: number, x: number) => setTimeout(() => feel.sparkle(x), ms),
  });
  fig.classList.add('live');

  const touch = matchMedia('(hover: none)').matches;
  const how = fig.querySelector('.ph-how');
  if (how) how.textContent = touch ? 'tap the soil to plant, or tap a flower to turn it.' : 'click the soil to plant, or click a flower to turn it.';

  const local = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  let down: { id: number; x: number; y: number; sx: number; sy: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const [x, y] = local(e), mouse = e.pointerType === 'mouse';
    garden.press(x, y, mouse ? SLOP.mouse : SLOP.touch);
    if (!mouse) { down = { id: e.pointerId, x, y, sx: e.clientX, sy: e.clientY }; return; }
    e.preventDefault();
    garden.plant(x, y, SLOP.mouse);
  });
  addEventListener('pointerup', (e) => {
    garden.release();
    if (!down || e.pointerId !== down.id) return;
    const d = down; down = null;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 12) garden.plant(d.x, d.y, SLOP.touch);
  });
  addEventListener('pointercancel', (e) => { if (down?.id === e.pointerId) { down = null; garden.release(); } });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { const [x, y] = local(e); garden.hover(x, y); } });
  canvas.addEventListener('pointerleave', () => garden.hover(-1, -1));

  // for the keyboard: somewhere open in the bed
  const plantBtn = fig.querySelector<HTMLButtonElement>('[data-plant]');
  if (plantBtn) {
    plantBtn.disabled = false;
    plantBtn.addEventListener('click', () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      for (let i = 0; i < 30; i++) {
        const x = 30 + Math.random() * (w - 60), y = h * .18 + Math.random() * h * .42;
        if (!garden.flowerAt(x, y)) { garden.plant(x, y); return; }
      }
      garden.plant(w / 2, h * .4);
    });
  }
  wireSound(fig.querySelector('[data-sound]'));
}
