// Pixel garden: cross-stitch flowers on white, stitched in one cell at a time, with a little grain.
// Canvas 2D. Animates in stepped frames (like pixel art should), and stops entirely when idle.
//
//   const garden = createGarden(canvas, { initial: 'auto' | 0, field(w, h, mob), onStitch, onBloom, onChange })
//   garden.plant(x, y)   // canvas-local CSS px; the flower's head lands there. returns { id, x, y, flowers: [{ x, y, r }] }
//   garden.patches()     // live flowers, shaped like the watercolour garden's patches so the bee can read them
//   garden.destroy()
//
// field(w, h, mob) -> { rect: [x0, y0, x1, y1], avoid: [[x0, y0, x1, y1], ...], n } places the opening field.

const MAX = 64;
const STEP = 26;          // ms between stitches while a flower grows
const SPARKS = '#ffd23f';

// heads. P petal, p petal shade, C centre, c centre shade
const HEADS = {
  tulip: ['P.P.P', 'PpPpP', 'pPPPp', '.pPp.'],
  cup: ['.P.P.', 'PPpPP', 'PCcCP', 'pPCPp', '.pPp.'],
  clover: ['.PP.PP.', 'PPPpPPP', 'PPpCpPP', '.pCcCp.', 'PPpCpPP', 'PPPpPPP', '.PP.PP.'],
  sun: ['...P.P...', '..PPPPP..', '.PPCcCPP.', 'PPCcCcCPP', '.PcCcCcP.', 'PPCcCcCPP', '.PPCcCPP.', '..PPPPP..', '...P.P...'],
  daisy: ['.P.', 'PCP', '.P.'],
  bell: ['.PP.', 'PpPP', 'PPpP', 'p..p'],
  star: ['..P..', 'P.p.P', '.pCp.', 'P.p.P', '..P..'],
};
const PALETTES = [
  { w: 22, P: '#e8412f', p: '#b8261d', C: '#ffd04a', c: '#e3a21a' },   // red
  { w: 22, P: '#ffc93c', p: '#f0a51c', C: '#e2562b', c: '#a83d18' },   // yellow
  { w: 14, P: '#f2602a', p: '#c9441a', C: '#ffd34d', c: '#f2b01e' },   // orange
  { w: 14, P: '#ffd02e', p: '#19a6a6', C: '#f2875c', c: '#e0613a' },   // yellow on teal, like a cross-stitch sampler
  { w: 16, P: '#2447d8', p: '#172f9e', C: '#ffd04a', c: '#f0a51c' },   // cobalt
  { w: 12, P: '#f594b8', p: '#e0628f', C: '#ffd04a', c: '#f0a51c' },   // pink
];
const STEM = { G: '#1f8a3a', g: '#16702d', L: '#35a64b' };
// sparkles twinkle through these frames
const SPARK = [['X'], ['.X.', 'XXX', '.X.'], ['..X..', '..X..', 'XX.XX', '..X..', '..X..'], ['.X.', 'XXX', '.X.'], ['X']];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickW = (rnd, list) => { let s = list.reduce((a, b) => a + b.w, 0) * rnd(); for (const it of list) if ((s -= it.w) < 0) return it; return list[0]; };

// build one flower: every cell in grid units relative to the head's centre, sorted in stitch order
function buildFlower(rnd, kind) {
  const names = Object.keys(HEADS);
  kind = kind || pickW(rnd, [{ k: 'tulip', w: 20 }, { k: 'cup', w: 20 }, { k: 'clover', w: 12 }, { k: 'sun', w: 6 }, { k: 'daisy', w: 14 }, { k: 'bell', w: 12 }, { k: 'star', w: 10 }].map(o => ({ ...o }))).k;
  if (!names.includes(kind)) kind = 'tulip';
  const head = HEADS[kind], pal = pickW(rnd, PALETTES);
  const hw = head[0].length, hh = head.length, ox = Math.floor(hw / 2), oy = Math.floor(hh / 2);
  const cells = [];
  head.forEach((row, r) => [...row].forEach((k, c) => { if (k !== '.') cells.push({ x: c - ox, y: r - oy, col: pal[k], o: 2, d: Math.hypot(c - ox, (r - oy) * 1.1) }); }));
  // stars and daisies sometimes float on their own, like stitches on a sampler
  const stemless = (kind === 'star' || kind === 'daisy') && rnd() < .45;
  if (!stemless) {
    const len = kind === 'sun' || kind === 'clover' ? 4 + Math.floor(rnd() * 6) : 3 + Math.floor(rnd() * 6);
    const top = hh - oy;
    let side = rnd() < .5 ? -1 : 1;
    for (let i = 0; i < len; i++) {
      const y = top + i;
      cells.push({ x: 0, y, col: i % 3 === 2 ? STEM.g : STEM.G, o: 0, d: -y });
      // leaves: a short bar off the stem, alternating sides, never at the very top
      if (i >= 1 && i < len - 1 && rnd() < .38) {
        const n = 1 + (rnd() < .55 ? 1 : 0);
        for (let j = 1; j <= n; j++) cells.push({ x: side * j, y, col: STEM.L, o: 1, d: -y + j * .1 });
        side = -side;
      }
    }
  }
  cells.sort((a, b) => a.o - b.o || (a.o === 2 ? a.d - b.d : a.d - b.d));
  const bottom = Math.max(...cells.map(c => c.y));
  return { kind, cells, r: Math.max(hw, hh) / 2, bottom, top: -oy };
}

function noiseTile(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = Math.random();
    if (r < .16) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 26 + Math.random() * 34; }        // paper showing through
    else if (r < .34) { d[i] = d[i + 1] = d[i + 2] = 30; d[i + 3] = 10 + Math.random() * 22; }    // ink pooling
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function createGarden(canvas, opts = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const live = [], dying = [], sparks = [];
  let nextId = 1, userPlanted = false, fieldPlanted = false, fieldW = 0, fieldH = 0, timers = [];
  let cssW = 0, cssH = 0, dpr = 1, cell = 6, grain = null, grainPat = null;
  let raf = 0, visible = true, destroyed = false, breeze = null, breezeT = 0, sparkT = 0, dirty = true;
  const api = { onChange: opts.onChange, plant, patches: () => live.map(pub), destroy, _stats: { frames: 0 } };
  const pub = f => ({ id: f.id, x: f.x, y: f.y, flowers: [{ x: f.x, y: f.y, r: f.r * cell + 2 }] });
  const changed = () => api.onChange?.(api.patches());
  const now = () => performance.now();

  function size() {
    const b = canvas.getBoundingClientRect();
    cssW = b.width; cssH = b.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cell = cssW <= 640 ? 5 : 7;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    if (!grain) grain = noiseTile(128);
    grainPat = ctx.createPattern(grain, 'repeat');
    // positions stay in CSS px; re-snap them to the new grid
    for (const f of live) { f.gx = Math.round(f.x / cell); f.gy = Math.round(f.y / cell); }
    dirty = true;
  }

  function add(x, y, rnd, t0, kind) {
    const fl = buildFlower(rnd, kind);
    const f = { id: nextId++, x, y, gx: Math.round(x / cell), gy: Math.round(y / cell), ...fl, t0, shown: reduced ? Infinity : 0, sway: 0 };
    f.x = f.gx * cell + cell / 2; f.y = f.gy * cell + cell / 2;
    live.push(f);
    live.sort((a, b) => (a.gy + a.bottom) - (b.gy + b.bottom));
    while (live.length > MAX) { const old = live.shift(); old.dieAt = now(); dying.push(old); }
    return f;
  }

  function spark(x, y, delay = 0, life = 1) {
    if (reduced) return;
    sparks.push({ gx: Math.round(x / cell), gy: Math.round(y / cell), t0: now() + delay, life });
  }

  function plant(x, y) {
    userPlanted = true;
    timers.forEach(clearTimeout); timers = [];
    // a tap deserves one of the showier ones
    const kind = pickW(Math.random, [{ k: 'tulip', w: 22 }, { k: 'cup', w: 22 }, { k: 'clover', w: 20 }, { k: 'sun', w: 14 }, { k: 'bell', w: 12 }, { k: 'star', w: 10 }]).k;
    const f = add(x, y, Math.random, now(), kind);
    opts.onBloom?.(f);
    // a couple of sparkles fly off as it lands
    for (let i = 0; i < 2 + (Math.random() < .5); i++) {
      const a = Math.random() * Math.PI * 2, d = (f.r + 3 + Math.random() * 5) * cell;
      spark(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, f.cells.length * STEP * .6 + i * 120, 1);
    }
    wake(); changed();
    return pub(f);
  }

  // the opening field: scattered like flowers on a sampler, kept off the type
  function plantField() {
    fieldPlanted = true; fieldW = cssW; fieldH = cssH;
    const mob = cssW <= 640;
    const o = opts.field?.(cssW, cssH, mob) || {};
    const [x0, y0, x1, y1] = o.rect || [24, cssH * .5, cssW - 24, cssH * .9];
    const avoid = o.avoid || [];
    const n = o.n ?? (mob ? 14 : 22);
    const rnd = mulberry(mob ? 7 : 11);
    const pts = [];
    const minD = Math.sqrt(((x1 - x0) * (y1 - y0)) / n) * .62;
    for (let tries = 0; pts.length < n && tries < n * 60; tries++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
      if (avoid.some(([a, b, c, d]) => x > a - 18 && x < c + 18 && y > b - 26 && y < d + 70)) continue;
      if (pts.some(p => Math.hypot(p.x - x, (p.y - y) * 1.3) < minD)) continue;
      pts.push({ x, y });
    }
    const start = now();
    // grow from the middle outwards, a few at a time
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    pts.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    const frnd = mulberry(3);
    pts.forEach((p, i) => add(p.x, p.y, frnd, start + (reduced ? 0 : 300 + i * 170)));
    const srnd = mulberry(5);
    for (let i = 0; i < (mob ? 6 : 10); i++) {
      const x = x0 + srnd() * (x1 - x0), y = y0 - 40 + srnd() * (y1 - y0 + 40);
      if (!avoid.some(([a, b, c, d]) => x > a && x < c && y > b && y < d)) spark(x, y, 900 + srnd() * 3000, 0);
    }
    changed();
  }

  // ---- drawing -------------------------------------------------------------------------
  const px = g => Math.round(g * cell * dpr);
  function rect(gx, gy, col) {
    const x = px(gx), y = px(gy);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, px(gx + 1) - x, px(gy + 1) - y);
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let busy = false;
    const paint = (f, k) => {
      const n = Math.min(f.cells.length, k);
      for (let i = 0; i < n; i++) {
        const c = f.cells[i];
        const dx = c.o === 2 || (c.o === 0 && c.y <= f.top + 1) ? f.sway : 0;
        // the newest stitch flashes paler for a step
        rect(f.gx + c.x + dx, f.gy + c.y, i >= n - 2 && n < f.cells.length ? '#fff3c2' : c.col);
      }
    };
    for (const f of dying) {
      const k = f.cells.length - Math.floor((t - f.dieAt) / (STEP * .6));
      if (k > 0) { paint(f, k); busy = true; }
    }
    for (let i = dying.length - 1; i >= 0; i--) if ((t - dying[i].dieAt) / (STEP * .6) > dying[i].cells.length) dying.splice(i, 1);
    for (const f of live) {
      if (t < f.t0) { busy = true; continue; }
      const k = reduced ? f.cells.length : Math.floor((t - f.t0) / STEP) + 1;
      if (k > f.shown && f.shown < f.cells.length) { opts.onStitch?.(f); f.shown = k; }
      if (k < f.cells.length) busy = true;
      paint(f, k);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      if (t < s.t0) { busy = true; continue; }
      const fr = Math.floor((t - s.t0) / 110);
      if (fr >= SPARK.length) {
        if (s.life) { sparks.splice(i, 1); continue; }
        s.t0 = t + 2400 + Math.random() * 5200;      // ambient ones rest, then twinkle again
        continue;
      }
      busy = true;
      const sh = SPARK[fr], o = Math.floor(sh.length / 2);
      sh.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') rect(s.gx + c - o, s.gy + r - o, SPARKS); }));
    }
    // grain sits only on the stitches
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = grainPat;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    api._stats.frames++;
    return busy;
  }

  // a breeze crosses now and then: each head leans one stitch as it passes
  function stepBreeze(t) {
    if (!breeze) return false;
    const front = (t - breeze.t0) * breeze.v;
    let any = false;
    for (const f of live) {
      const d = breeze.dir > 0 ? front - f.x : (cssW - front) - f.x;
      const lean = d > 0 && d < 90 ? breeze.dir : 0;
      if (lean !== f.sway) { f.sway = lean; dirty = true; }
      if (d < 90) any = true;
    }
    if (!any) { breeze = null; for (const f of live) f.sway = 0; dirty = true; schedule(); }
    return !!breeze;
  }
  function schedule() {
    clearTimeout(breezeT);
    if (reduced || destroyed) return;
    breezeT = setTimeout(() => { breeze = { t0: now(), v: .5 + Math.random() * .25, dir: Math.random() < .7 ? 1 : -1 }; wake(); }, 5000 + Math.random() * 5000);
  }

  let lastStep = 0;
  function loop(t) {
    raf = 0;
    if (destroyed || !visible || document.hidden) return;
    const b = stepBreeze(t);
    const due = sparks.some(s => t >= s.t0) || live.some(f => f.shown < f.cells.length) || dying.length;
    if (dirty || due || b) {
      // stitches land at the step rate; nothing needs 60fps here
      if (t - lastStep >= 24 || dirty) { lastStep = t; dirty = false; draw(t); }
    }
    const next = sparks.reduce((m, s) => Math.min(m, s.t0), Infinity);
    const growing = live.some(f => f.shown < f.cells.length) || dying.length || b || sparks.some(s => t >= s.t0);
    if (growing) raf = requestAnimationFrame(loop);
    else {
      draw(t);
      if (next < Infinity) { clearTimeout(sparkT); sparkT = setTimeout(wake, Math.max(16, next - now())); }
    }
  }
  function wake() { if (!raf && !destroyed) raf = requestAnimationFrame(loop); }

  function onResize() {
    size();
    if (cssW < 1 || cssH < 1) return;
    if (opts.initial === 'auto' && !userPlanted) {
      if (!fieldPlanted) plantField();
      else if (Math.abs(cssW - fieldW) > 24 || Math.abs(cssH - fieldH) > 120) {
        live.length = 0; dying.length = 0; sparks.length = 0;
        plantField();
      }
    }
    dirty = true; wake();
  }

  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  const io = new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) { dirty = true; wake(); } });
  io.observe(canvas);
  const onVis = () => { if (!document.hidden) { dirty = true; wake(); } };
  document.addEventListener('visibilitychange', onVis);
  onResize();
  schedule();
  requestAnimationFrame(() => canvas.classList.add('on'));

  function destroy() {
    destroyed = true; cancelAnimationFrame(raf); clearTimeout(breezeT); clearTimeout(sparkT);
    timers.forEach(clearTimeout); ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  }
  return api;
}
