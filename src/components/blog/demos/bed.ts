// a small bed for the demos that need to bend the garden's rules (a garden of eight, say): the garden's own sprites
// and stitch order (plant.ts), drawn the garden's way. stepped frames, the newest stitch flashing pale, and nothing
// drawn at all while nothing moves
import { grow, KINDS, type Plant } from '../plant';

const STEP = 26, FLASH = '#fff3c2';
export type Bloom = Plant & { id: number; gx: number; gy: number; t0: number; dieAt?: number; dstep?: number };

export function createBed(canvas: HTMLCanvasElement, { onDraw }: { onDraw?: () => void } = {}) {
  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live: Bloom[] = [], dying: Bloom[] = [];
  let cell = 4, dpr = 1, raf = 0, id = 1, w = 0, h = 0, mark: Bloom | null = null;

  function size() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cell = Math.round((w <= 640 ? 3.4 : 4.5) * dpr) / dpr;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    wake();
  }
  const px = (g: number) => Math.round(g * cell * dpr);
  const rect = (gx: number, gy: number, col: string) => { const x = px(gx), y = px(gy); ctx.fillStyle = col; ctx.fillRect(x, y, px(gx + 1) - x, px(gy + 1) - y); };

  function draw(t: number) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let busy = false;
    for (let i = dying.length - 1; i >= 0; i--) {
      const f = dying[i], k = f.cells.length - Math.floor((t - f.dieAt!) / f.dstep!);
      if (k <= 0) { dying.splice(i, 1); continue; }
      for (let j = 0; j < Math.min(k, f.cells.length); j++) rect(f.gx + f.cells[j].x, f.gy + f.cells[j].y, f.cells[j].col);
      busy = true;
    }
    for (const f of live) {
      const k = reduced ? f.cells.length : Math.min(f.cells.length, Math.floor((t - f.t0) / STEP) + 1);
      if (k < 1) { busy = true; continue; }
      for (let j = 0; j < k; j++) rect(f.gx + f.cells[j].x, f.gy + f.cells[j].y, j >= k - 2 && k < f.cells.length ? FLASH : f.cells[j].col);
      if (k < f.cells.length) busy = true;
    }
    // the next to go wears a small ink stitch over its head
    if (mark && live.includes(mark)) {
      const mx = mark.gx + Math.round((mark.box[0] + mark.box[2]) / 2), my = mark.gy + mark.box[1] - 4;
      for (const [dx, dy] of [[-1, 0], [0, 0], [1, 0], [0, 1]]) rect(mx + dx, my + dy, '#1f1d1b');
    }
    onDraw?.();
    return busy;
  }
  function loop(t: number) {
    raf = 0;
    if (draw(t)) raf = requestAnimationFrame(loop);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(loop); }

  // a plant whose head lands near (x, y), kept inside the bed. kind: any of the garden's, unless given
  // seed/form/pal pin the look; instant draws it grown (for a bed that starts planted)
  function plant(x: number, y: number, kind = KINDS[Math.floor(Math.random() * KINDS.length)], o: { seed?: number; form?: number; pal?: number; instant?: boolean } = {}) {
    const p = grow(kind, { seed: o.seed ?? Math.floor(Math.random() * 1e9), form: o.form ?? Math.floor(Math.random() * 3), pal: o.pal ?? Math.floor(Math.random() * 4) });
    const [x0, y0, x1, y1] = p.box;
    const gx = Math.max(-x0 + 1, Math.min(Math.floor(w / cell) - x1 - 2, Math.round(x / cell)));
    const gy = Math.max(-y0 + 1, Math.min(Math.floor(h / cell) - y1 - 2, Math.round(y / cell)));
    const f: Bloom = { ...p, id: id++, gx, gy, t0: o.instant ? -1e9 : performance.now() };
    live.push(f);
    // drawn back to front, so lower plants stand in front
    live.sort((a, b) => a.gy + a.box[3] - (b.gy + b.box[3]));
    wake();
    return f;
  }
  // the oldest unpicks, newest stitch first, over about three seconds (quicker for a big flower, as in the garden)
  function unpick(f: Bloom) {
    live.splice(live.indexOf(f), 1);
    f.dieAt = performance.now();
    f.dstep = reduced ? 1 : Math.min(85, 3000 / f.cells.length);
    dying.push(f);
    wake();
  }
  function clear() { live.length = 0; dying.length = 0; mark = null; wake(); }
  const oldest = () => live.reduce<Bloom | null>((a, b) => (!a || b.id < a.id ? b : a), null);

  size();
  new ResizeObserver(size).observe(canvas);
  return { plant, unpick, clear, oldest, live, mark: (f: Bloom | null) => { mark = f; wake(); }, get busy() { return !!raf; }, get cell() { return cell; }, size: () => [w, h] };
}
