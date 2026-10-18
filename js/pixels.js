// Pixel garden: cross-stitch flowers on white, stitched in one cell at a time, with a little grain.
// Canvas 2D. Animates in stepped frames (like pixel art should), and stops entirely when idle.
//
//   const garden = createGarden(canvas, { initial: 'auto' | 0, field(w, h, mob), onStitch, onBloom, onSparkle(ms, x), onChange })
//   garden.plant(x, y)   // canvas-local CSS px; the flower's head lands there. returns { id, x, y, flowers: [{ x, y, r }] }
//   garden.patches()     // live flowers, shaped like the watercolour garden's patches so the bee can read them
//   garden.clear()       // every flower unstitches; resolves when the soil is bare
//   garden.destroy()
//
// opts.onGrown() fires each time everything has finished stitching in.
//
// field(w, h, mob) -> { rect: [x0, y0, x1, y1], avoid: [[x0, y0, x1, y1], ...], n } places the opening field.

import { FLOWERS } from './flora.js';

const MAX = 64;
const STEP = 26;          // ms between stitches while a flower grows
const SPARKS = ['#ffd23f', '#f594b8', '#4baff8', '#ff8a3d'];   // the ambient twinkles; a bloom's own sparkles take its colour

// heads. P petal, p petal shade, C centre, c centre shade
const HEADS = {
  tulip: ['P.P.P', 'PpPpP', 'pPPPp', '.pPp.'],
  cup: ['.P.P.', 'PPpPP', 'PCcCP', 'pPCPp', '.pPp.'],
  clover: ['.PP.PP.', 'PPPpPPP', 'PPpCpPP', '.pCcCp.', 'PPpCpPP', 'PPPpPPP', '.PP.PP.'],
  sun: ['...P.P...', '..PPPPP..', '.PPCcCPP.', 'PPCcCcCPP', '.PcCcCcP.', 'PPCcCcCPP', '.PPCcCPP.', '..PPPPP..', '...P.P...'],
  daisy3: ['.P.', 'PCP', '.P.'],
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
// what grows: mostly the stitched kinds; a moodboard flower turns up about one time in five, as a little treat
const KINDS = [
  { k: 'lily', w: 1.5 }, { k: 'bluelily', w: 1.5 }, { k: 'daisy', w: 1.5 }, { k: 'bud', w: 1.2 }, { k: 'lavender', w: 1.5 },
  { k: 'forget', w: 1 }, { k: 'forgetpale', w: .6 }, { k: 'forgetbright', w: 1 },
  { k: 'tulip', w: 7 }, { k: 'cup', w: 8 }, { k: 'clover', w: 6 }, { k: 'sun', w: 4 }, { k: 'daisy3', w: 5 }, { k: 'bell', w: 5 }, { k: 'star', w: 5 },
];
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
const hue = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 24) return -1;
  const h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn);
  return (h * 60 + 360) % 360; };
// the colour a flower is known by: its most saturated petal colour that isn't near-black or near-white
function accent(cells) {
  const score = {};
  for (const c of cells) {
    if (c.o !== 2) continue;
    const n = parseInt(c.col.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 90 || mn > 225) continue;
    score[c.col] = (score[c.col] || 0) + (mx - mn) / mx;
  }
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] || SPARKS[0];
}
const pickW = (rnd, list) => { let s = list.reduce((a, b) => a + b.w, 0) * rnd(); for (const it of list) if ((s -= it.w) < 0) return it; return list[0]; };

// a moodboard sprite, whole plant and all: leaves stitch up from the ground, then the bloom opens from its centre.
// worked out once per sprite and facing; every planting shares the cells
const SPRITES = {};
function buildSprite(kind, flip) {
  const key = kind + (flip ? '<' : '>');
  if (SPRITES[key]) return SPRITES[key];
  const s = FLOWERS[kind], W = s.rows[0].length, [hx, hy] = s.head;
  const at = (x, y) => { const ch = s.rows[y]?.[x]; return ch && ch !== '.' ? parseInt(ch, 16) : -1; };
  // the outline is the colour that hugs the silhouette most; it joins whichever part it outlines
  const edge = s.pal.map(() => 0);
  s.rows.forEach((row, y) => [...row].forEach((ch, x) => { const i = at(x, y); if (i >= 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, y + b) < 0)) edge[i]++; }));
  const ol = edge.indexOf(Math.max(...edge));
  const leafy = s.pal.map(c => { const h = hue(c); return h > 68 && h < 170; });
  const cells = [];
  s.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const i = at(x, y);
    if (i < 0) return;
    let leaf = leafy[i];
    if (i === ol) {
      let g = 0, b = 0;
      for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) { const j = at(x + a, y + c); if (j >= 0 && j !== ol) leafy[j] ? g++ : b++; }
      leaf = g > b || (g === b && y > hy + 3);
    }
    const cx = (flip ? W - 1 - x : x) - (flip ? W - 1 - hx : hx), cy = y - hy;
    cells.push(leaf ? { x: cx, y: cy, col: s.pal[i], o: 0, d: -cy + Math.abs(cx) * .3 } : { x: cx, y: cy, col: s.pal[i], o: 2, d: Math.hypot(cx, cy * 1.1) });
  }));
  cells.sort((a, b) => a.o - b.o || a.d - b.d);
  const bloom = cells.filter(c => c.o === 2);
  return (SPRITES[key] = { kind, cells, sprite: true, tint: accent(cells), r: Math.min(4, Math.max(2, ...bloom.map(c => Math.hypot(c.x, c.y))) * .7),
    bottom: Math.max(...cells.map(c => c.y)), top: Math.min(...cells.map(c => c.y)),
    box: [Math.min(...cells.map(c => c.x)), Math.min(...cells.map(c => c.y)), Math.max(...cells.map(c => c.x)), Math.max(...cells.map(c => c.y))] });
}

// a palette that stands apart from its neighbours: far round the colour wheel from them, never the one just used
let lastPal = null;
const hueGap = (a, b) => a < 0 || b < 0 ? 90 : Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
function choosePal(rnd, tints = []) {
  const hs = tints.map(hue);
  const score = o => (hs.length ? Math.min(...hs.map(h => hueGap(hue(o.P), h))) : 90) + rnd() * 50 + o.w;
  const pal = PALETTES.filter(o => o !== lastPal).sort((a, b) => score(b) - score(a))[0];
  return (lastPal = pal);
}
// recolour a stitched flower in place: its head cells remember which part of the palette they are
function recolour(fl, pal) {
  for (const c of fl.cells) if (c.k) c.col = pal[c.k];
  fl.tint = accent(fl.cells);
  return fl;
}
// build one flower: every cell in grid units relative to the head's centre, sorted in stitch order
function buildFlower(rnd, kind) {
  kind = kind || pickW(rnd, KINDS).k;
  if (FLOWERS[kind]) return buildSprite(kind, rnd() < .5);
  if (!HEADS[kind]) kind = 'tulip';
  // a fresh colour each time: never the same palette twice in a row
  const head = HEADS[kind], pal = choosePal(rnd);
  const hw = head[0].length, hh = head.length, ox = Math.floor(hw / 2), oy = Math.floor(hh / 2);
  const cells = [];
  head.forEach((row, r) => [...row].forEach((k, c) => { if (k !== '.') cells.push({ x: c - ox, y: r - oy, k, col: pal[k], o: 2, d: Math.hypot(c - ox, (r - oy) * 1.1) }); }));
  // stars and daisies sometimes float on their own, like stitches on a sampler
  const stemless = (kind === 'star' || kind === 'daisy3') && rnd() < .45;
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
    // now and then a little tuft of grass where the stem meets the ground
    if (rnd() < .45) {
      const y = top + len - 1;
      [[-1, 'L'], [1, 'G'], [-2, 'g'], [2, 'L']].forEach(([x, k], j) => { if (j < 2 || rnd() < .6) cells.push({ x, y, col: STEM[k], o: 0, d: -y - .5 + j * .1 }); });
      cells.push({ x: rnd() < .5 ? -1 : 1, y: y - 1, col: STEM.L, o: 0, d: -y + .7 });
    }
  }
  cells.sort((a, b) => a.o - b.o || a.d - b.d);
  const bottom = Math.max(...cells.map(c => c.y));
  const xs = cells.map(c => c.x);
  return { kind, cells, tint: accent(cells), r: Math.max(hw, hh) / 2, bottom, top: -oy, box: [Math.min(...xs), -oy, Math.max(...xs), bottom] };
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
  const live = [], dying = [], sparks = [], petals = [], recent = [];
  let nextId = 1, userPlanted = false, fieldPlanted = false, fieldW = 0, fieldH = 0, timers = [];
  let cssW = 0, cssH = 0, dpr = 1, cell = 6, su = 3, grain = null, grainPat = null;
  let raf = 0, visible = true, destroyed = false, breeze = null, breezeT = 0, sparkT = 0, dirty = true, growing = false;
  const api = { onChange: opts.onChange, plant, patches: () => live.map(pub), clear, destroy, _stats: { frames: 0 } };
  const pub = f => ({ id: f.id, x: f.x, y: f.y, flowers: [{ x: f.x, y: f.y, r: f.r * f.u + 2 }] });
  // moodboard sprites carry far more detail, so they're stitched on a finer grid and stay flower-sized
  const unit = fl => fl.sprite ? su : cell;
  const changed = () => api.onChange?.(api.patches());
  const now = () => performance.now();

  function size() {
    const b = canvas.getBoundingClientRect();
    cssW = b.width; cssH = b.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cell = cssW <= 640 ? 5 : 7;
    su = cssW <= 640 ? 2 : 3;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    if (!grain) grain = noiseTile(128);
    grainPat = ctx.createPattern(grain, 'repeat');
    // positions stay in CSS px; re-snap them to the new grid
    for (const f of live) { f.u = unit(f); f.gx = Math.round(f.x / f.u); f.gy = Math.round(f.y / f.u); }
    dirty = true;
  }

  function add(x, y, rnd, t0, kind) {
    const fl = typeof kind === 'object' ? kind : buildFlower(rnd, kind);
    // big sprites stitch several cells a step, so nothing takes much longer than a second and a half to grow
    const u = unit(fl);
    const f = { id: nextId++, x, y, u, gx: Math.round(x / u), gy: Math.round(y / u), ...fl, t0, step: Math.min(STEP, 900 / fl.cells.length), shown: reduced ? Infinity : 0, sway: 0 };
    f.x = f.gx * u + u / 2; f.y = f.gy * u + u / 2;
    live.push(f);
    live.sort((a, b) => (a.gy + a.bottom) - (b.gy + b.bottom));
    while (live.length > MAX) { const old = live.shift(); old.dieAt = now(); old.dstep = Math.min(STEP * .6, 700 / old.cells.length); dying.push(old); }
    if (!reduced) growing = true;
    return f;
  }

  function spark(x, y, delay = 0, life = 1, col = SPARKS[0]) {
    if (reduced) return;
    sparks.push({ gx: Math.round(x / cell), gy: Math.round(y / cell), t0: now() + delay, life, col });
  }
  // as a flower finishes, a sparkle or two winks beside its head in the flower's own colour
  function twinkle(f, n, after = 0) {
    const r = f.r * f.u, side = Math.random() < .5 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? -side : side;
      spark(f.x + s * (r + cell * (2.2 + Math.random() * 1.6)), f.y - cell * (Math.random() * 2.5), after + i * 160, 1, f.tint);
    }
  }

  // a flower's footprint in CSS px if its head sat at (x, y)
  const boxAt = (fl, x, y) => { const u = unit(fl), [a, b, c, d] = fl.box; return [x + a * u, y + b * u, x + (c + 1) * u, y + (d + 1) * u]; };
  const clash = (bx, others) => {
    const area = (bx[2] - bx[0]) * (bx[3] - bx[1]);
    return others.some(o => {
      const ob = boxAt(o, o.x, o.y), ov = Math.max(0, Math.min(bx[2], ob[2]) - Math.max(bx[0], ob[0])) * Math.max(0, Math.min(bx[3], ob[3]) - Math.max(bx[1], ob[1]));
      return ov > .1 * Math.min(area, (ob[2] - ob[0]) * (ob[3] - ob[1]));
    });
  };
  // reads the neighbourhood before choosing: a kind none of its neighbours are, a colour that stands apart from theirs,
  // and a spot a step or two off the tap if that's what keeps it from covering anyone. too crowded? a tiny one tucks in.
  function choose(x, y) {
    const near = live.filter(f => Math.hypot(f.x - x, (f.y - y) * 1.2) < (cssW <= 640 ? 110 : 170));
    const taken = new Set([...near.map(f => f.kind), ...recent]);
    const pool = KINDS.filter(o => o.k !== 'daisy3' && !taken.has(o.k));
    const order = [];
    for (let left = pool.length ? [...pool] : KINDS.filter(o => !recent.includes(o.k)); left.length;) { const o = pickW(Math.random, left); order.push(o.k); left = left.filter(q => q !== o); }
    const nudges = [[0, 0]];
    for (const d of [1, 2, 3]) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + d; nudges.push([Math.cos(a) * d * cell * 2, Math.sin(a) * d * cell * 1.6]); }
    const room = (fl, at) => { const bx = boxAt(fl, at[0], at[1]); return bx[0] > 2 && bx[2] < cssW - 2 && bx[3] < cssH - 2 && !clash(bx, near); };
    const tints = near.map(f => f.tint);
    for (const k of order) {
      const fl = buildFlower(Math.random, k);
      const at = nudges.map(([dx, dy]) => [x + dx, y + dy]).find(p => room(fl, p));
      if (at) return { fl: fl.sprite ? fl : recolour(fl, choosePal(Math.random, tints)), x: at[0], y: at[1] };
    }
    for (const k of ['daisy3', 'star', 'bell']) {
      const fl = buildFlower(Math.random, k), at = nudges.map(([dx, dy]) => [x + dx, y + dy]).find(p => room(fl, p));
      if (at) return { fl: recolour(fl, choosePal(Math.random, tints)), x: at[0], y: at[1] };
    }
    return { fl: recolour(buildFlower(Math.random, 'daisy3'), choosePal(Math.random, tints)), x, y };
  }

  function plant(x, y) {
    userPlanted = true;
    timers.forEach(clearTimeout); timers = [];
    const pick = choose(x, y);
    x = pick.x; y = pick.y;
    recent.push(pick.fl.kind); if (recent.length > 4) recent.shift();
    const f = add(x, y, Math.random, now(), pick.fl);
    opts.onBloom?.(f);
    // two sparkles wink either side of it as it opens
    twinkle(f, 2, f.cells.length * f.step * .75);
    opts.onSparkle?.(f.cells.length * f.step * .75, f.x);
    if (reduced) setTimeout(() => opts.onGrown?.());
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
    const rnd = mulberry(mob ? 7 : 11), frnd = mulberry(3);
    const pts = [];
    const minD = Math.sqrt(((x1 - x0) * (y1 - y0)) / n) * .62;
    // dealt from a shuffled deck so the bed stays varied: stitched flowers, with two or three moodboard ones tucked in
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(frnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const treats = shuffle(Object.keys(FLOWERS)).slice(0, mob ? 2 : 3);
    const hand = shuffle([...treats, ...KINDS.filter(o => !FLOWERS[o.k]).flatMap(o => Array(Math.max(1, Math.round(o.w / 3))).fill(o.k))]);
    let fl = null, miss = 0, dealt = 0;
    const boxes = [];
    for (let tries = 0; pts.length < n && tries < n * 80; tries++) {
      // a plant that won't fit anywhere makes way for the next card
      if (!fl || ++miss > 50) { fl = buildFlower(frnd, hand[dealt++ % hand.length]); miss = 0; }
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
      // the whole plant keeps off the type, not just its head
      const u = unit(fl), [bx0, by0, bx1, by1] = fl.box, a0 = x + bx0 * u - 6, b0 = y + by0 * u - 6, a1 = x + (bx1 + 1) * u + 6, b1 = y + (by1 + 1) * u;
      if (a0 < 4 || a1 > cssW - 4 || b1 > cssH - 4) continue;
      if (avoid.some(([a, b, c, d]) => a1 > a && a0 < c && b1 > b && b0 < d)) continue;
      if (pts.some(p => Math.hypot(p.x - x, (p.y - y) * 1.3) < (p.fl.kind === fl.kind ? minD * 2.4 : minD))) continue;
      // plants may brush leaves, but never stand in front of each other
      const area = (a1 - a0) * (b1 - b0);
      if (boxes.some(([c0, d0, c1, d1]) => Math.max(0, Math.min(a1, c1) - Math.max(a0, c0)) * Math.max(0, Math.min(b1, d1) - Math.max(b0, d0)) > .12 * Math.min(area, (c1 - c0) * (d1 - d0)))) continue;
      boxes.push([a0, b0, a1, b1]);
      // its colour answers the neighbours'
      if (!fl.sprite) recolour(fl, choosePal(frnd, pts.filter(p => Math.hypot(p.x - x, p.y - y) < minD * 1.8).map(p => p.fl.tint)));
      pts.push({ x, y, fl }); fl = null; miss = 0;
    }
    const start = now();
    // grow one at a time, from the middle outwards, each one sparkling as it opens
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    pts.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    pts.forEach((p, i) => {
      const f = add(p.x, p.y, frnd, start + (reduced ? 0 : 500 + i * 420), p.fl);
      if (i % 2 === 0 || i < 3) twinkle(f, 1, f.t0 - now() + f.cells.length * f.step * .8);
    });
    const srnd = mulberry(5);
    for (let i = 0; i < (mob ? 4 : 7); i++) {
      const x = x0 + srnd() * (x1 - x0), y = y0 - 40 + srnd() * (y1 - y0 + 40);
      if (!avoid.some(([a, b, c, d]) => x > a && x < c && y > b && y < d)) spark(x, y, 900 + pts.length * 420 + srnd() * 3000, 0, SPARKS[i % SPARKS.length]);
    }
    if (reduced) setTimeout(() => opts.onGrown?.());
    changed();
  }

  // everything unstitches, newest stitch first, in a quick sweep across the bed; a few petals drift down
  function clear() {
    userPlanted = true;
    timers.forEach(clearTimeout); timers = [];
    sparks.length = 0;
    const t = now(), all = live.splice(0);
    if (reduced || !all.length) {
      dying.length = 0; petals.length = 0; dirty = true; wake(); changed();
      return Promise.resolve();
    }
    let end = t;
    for (const f of all) {
      f.shown = f.cells.length;
      f.dieAt = t + (f.x / (cssW || 1)) * 260 + Math.random() * 90;
      f.dstep = 420 / f.cells.length;
      end = Math.max(end, f.dieAt + 420);
      dying.push(f);
      // petals: a couple of bloom cells come loose as they unpick
      const bloom = f.cells.filter(c => c.o === 2);
      for (let i = 0; i < 1 + (Math.random() < .5); i++) {
        const k = Math.floor(Math.random() * bloom.length), c = bloom[k];
        if (!c) break;
        const idx = f.cells.indexOf(c);
        petals.push({ gx: Math.round((f.gx + c.x) * f.u / cell), gy: Math.round((f.gy + c.y) * f.u / cell), col: c.col, t0: f.dieAt + (f.cells.length - idx) * f.dstep, life: 520 + Math.random() * 380, side: Math.random() < .5 ? -1 : 1 });
      }
    }
    end = Math.max(end, ...petals.map(p => p.t0 + p.life));
    dirty = true; wake(); changed();
    return new Promise(res => setTimeout(res, end - t + 30));
  }

  // ---- drawing -------------------------------------------------------------------------
  const px = (g, u) => Math.round(g * u * dpr);
  function rect(gx, gy, col, u = cell) {
    const x = px(gx, u), y = px(gy, u);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, px(gx + 1, u) - x, px(gy + 1, u) - y);
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let busy = false;
    const paint = (f, k) => {
      const n = Math.min(f.cells.length, k), fresh = Math.max(2, Math.round(24 / (f.step || STEP)));
      for (let i = 0; i < n; i++) {
        const c = f.cells[i];
        const dx = c.o === 2 || (c.o === 0 && c.y <= f.top + 1) ? f.sway : 0;
        // the newest stitch flashes paler for a step
        rect(f.gx + c.x + dx, f.gy + c.y, i >= n - fresh && n < f.cells.length ? '#fff3c2' : c.col, f.u);
      }
    };
    const ds = f => f.dstep || STEP * .6;
    for (const f of dying) {
      const k = f.cells.length - Math.max(0, Math.floor((t - f.dieAt) / ds(f)));
      if (k > 0) { paint(f, k); busy = true; }
    }
    for (let i = dying.length - 1; i >= 0; i--) if ((t - dying[i].dieAt) / ds(dying[i]) > dying[i].cells.length) dying.splice(i, 1);
    // loose petals fall a stitch at a time, swaying side to side
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i], e = t - p.t0;
      if (e < 0) { busy = true; continue; }
      if (e > p.life) { petals.splice(i, 1); continue; }
      const fall = Math.floor(e / 62);
      rect(p.gx + (Math.floor(fall / 3) % 2 ? p.side : 0), p.gy + fall, p.col);
      busy = true;
    }
    for (const f of live) {
      if (t < f.t0) { busy = true; continue; }
      const k = reduced ? f.cells.length : Math.floor((t - f.t0) / f.step) + 1;
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
      sh.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') rect(s.gx + c - o, s.gy + r - o, s.col); }));
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
    const due = sparks.some(s => t >= s.t0) || live.some(f => f.shown < f.cells.length) || dying.length || petals.length;
    if (dirty || due || b) {
      // stitches land at the step rate; nothing needs 60fps here
      if (t - lastStep >= 24 || dirty) { lastStep = t; dirty = false; draw(t); }
    }
    const next = sparks.reduce((m, s) => Math.min(m, s.t0), Infinity);
    const sprouting = live.some(f => f.shown < f.cells.length);
    if (growing && !sprouting && live.length) opts.onGrown?.();
    growing = sprouting;
    const busy = sprouting || dying.length || petals.length || b || sparks.some(s => t >= s.t0);
    if (busy) raf = requestAnimationFrame(loop);
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
