// Pixel garden: cross-stitch flowers on white, stitched in one cell at a time, with a little grain.
// Canvas 2D. Animates in stepped frames (like pixel art should), and stops entirely when idle.
//
//   const garden = createGarden(canvas, { initial: 'auto' | 0, field(w, h, mob), onStitch, onBloom, onSparkle(ms, x), onChange })
//   garden.plant(x, y, slop)     // canvas-local CSS px; the flower's head lands there. returns { id, x, y, flowers: [{ x, y, r }] }
//                                // on a flower already there, that one turns into another of its kind instead ({ ..., morphed: how })
//   garden.patches()             // live flowers, shaped like the watercolour garden's patches so the bee can read them
//   garden.flowerAt(x, y, slop)  // the flower a tap there would turn, or null on bare soil
//   garden.press(x, y, slop)     // a finger or button goes down: the flower under it dips a stitch until release()
//   garden.hover(x, y)           // the pointer's over (x, y): a flower there leans towards it. true if there's one
//   garden.clear()               // every flower unstitches; resolves when the soil is bare
//   garden.destroy()
//
// slop is how many CSS px off a flower a tap may land and still count as on it (a fingertip's worth, say).
// opts.onGrown() fires each time everything has finished stitching in. opts.onMorph(f, how) when a tapped flower turns
// ('ripple' or 'scatter').
//
// field(w, h, mob) -> { rect: [x0, y0, x1, y1], avoid: [[x0, y0, x1, y1], ...], n } places the opening field.

import { FLOWERS } from './flora.js';

// how full the garden gets before the oldest flowers start to make room
const FULL = { phone: 24, desk: 40 };
const STEP = 26;          // ms between stitches while a flower grows
const SPARKS = ['#ffd23f', '#f594b8', '#4baff8', '#ff8a3d'];   // the ambient twinkles; a bloom's own sparkles take its colour

// cells are snapped to whole device pixels; phones get a finer grid so the flowers sit smaller there
const CELL = { phone: 3.4, desk: 4.5 };
// every plant gets one set of greens: G stem, g stem shade, L leaf, l leaf in the light
const GREENS = [
  { G: '#2f8f3e', g: '#1d6b2c', L: '#45a84f', l: '#86d06c' },
  { G: '#3c8f2a', g: '#2b6e1e', L: '#6dbb45', l: '#a6dc6a' },   // spring
  { G: '#1d7d5c', g: '#145e45', L: '#3aa57c', l: '#74cfa2' },   // sage
];
// leaf shapes, as [dx, dy, green] out from the stem on one side: sweeping up, broad and reaching, a blade held out,
// drooping, narrow and hugging the stem
const LEAVES = [
  [[1, 0, 'L'], [2, 0, 'L'], [2, -1, 'l'], [3, -1, 'L']],
  [[1, 0, 'L'], [1, -1, 'l'], [2, -1, 'L'], [2, -2, 'l'], [3, -2, 'L']],
  [[1, 0, 'L'], [2, 0, 'l'], [3, 0, 'L'], [2, 1, 'g']],
  [[1, 0, 'l'], [2, 1, 'L'], [3, 1, 'L']],
  [[1, -1, 'l'], [1, 0, 'L'], [2, -2, 'L']],
];
// what grows, and how often (w is per family; a family's forms share it). staples make up most of the bed, accents
// break it up, and showpieces are the rare moment. any family flora.js adds that isn't listed here grows as an accent. the filler is never picked
// outright: it only tucks into a tight spot between bigger blooms, or one nothing else fits
const KINDS = {
  staple: { w: 10, kinds: ['tulip', 'blossom', 'daisy', 'cosmos', 'poppy', 'forget'] },
  accent: { w: 4.5, kinds: ['pansy', 'daffodil', 'lavender', 'iris', 'bluebell', 'allium'] },
  show: { w: 3.5, kinds: ['sunflower', 'lily'] },
  filler: { w: 1.5, kinds: ['mini'] },
};
// showpieces stay scarce: at most this many live at once, this many open the field, and at least `gap` plantings
// between one and the next. with the weights above that's about one planting in thirty, or one flower in twenty
// counting the field's own
const SHOW = { live: { phone: 2, desk: 3 }, field: { phone: 1, desk: 2 }, gap: 9 };
// a flower's neighbourhood, in cells so it scales with the flowers: no kind grows within REACH of itself (the small
// sprays may drift loosely past half of it), big heads and tall stems keep CLOSE apart, showpieces keep APART
const REACH = 44, CLOSE = 22, APART = 48;
// a kind that went in during the last few plantings goes to the back of the deck, so a run cycles through the variety
const MEMORY = 6;
const TALL = new Set(['sunflower', 'allium', 'lily', 'iris']);
// a family that grows fills out on its own: its next stage every so often, and some while after it's full it starts
// small again (ms, a range)
const RIPEN = { stage: [7000, 12000], full: [24000, 38000] };
// how a tapped flower turns into the next (ms): a ripple when the new head is the same size as the old, a scatter
// when it's bigger or smaller. each new stitch lands in FLASH for a moment
const TURNS = { ripple: 520, scatter: 380 };
const FLASH = '#fff3c2', FLASH_MS = 80;
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
// a colour's place on the wheel, or -1 for whites and greys. remembered, since the gardener asks a lot
const HUES = new Map();
const hue = hex => { if (HUES.has(hex)) return HUES.get(hex);
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const h = mx - mn < 24 ? -1 : ((mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn)) * 60 + 360) % 360;
  HUES.set(hex, h);
  return h; };
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

// every family flora.js draws, as its forms (a plain { head, pals } is a family of one), each form sized by its
// filled head cells. the heaviest fifth are big heads; the lightest sprays are small, and only they may drift together
const FAM = {};
for (const [k, f] of Object.entries(FLOWERS))
  FAM[k] = { grows: !!f.grows, forms: (f.forms || [f]).map(({ head, pals, foot }) => ({ head, pals, foot, mass: head.join('').replace(/[.GgLl]/g, '').length })) };
// and the family as a whole: its tier and weight, a middling form's size, and every colourway it comes in
const KIND = {};
const mid = a => a.sort((p, q) => p - q)[a.length >> 1];
for (const [k, { forms }] of Object.entries(FAM)) {
  const tier = Object.keys(KINDS).find(t => KINDS[t].kinds.includes(k)) || 'accent';
  KIND[k] = { k, tier, w: KINDS[tier].w, mass: mid(forms.map(o => o.mass)), pals: [...new Set(forms.flatMap(o => o.pals))] };
}
const BLOOMS = Object.values(KIND).filter(o => o.tier !== 'filler');
const heaviest = Math.max(...BLOOMS.flatMap(o => FAM[o.k].forms.map(f => f.mass)));
const sizeOf = mass => mass >= heaviest * .8 ? 2 : mass <= heaviest * .4 ? 0 : 1;
for (const o of Object.values(KIND)) { o.size = sizeOf(o.mass); for (const f of FAM[o.k].forms) f.size = sizeOf(f.mass); }
const FILLER = Object.values(KIND).find(o => o.tier === 'filler') || [...BLOOMS].sort((a, b) => a.mass - b.mass)[0];
// when nowhere near the tap has room: the filler's smallest form, then the two smallest forms of other families
const smallest = k => FAM[k].forms.reduce((a, f, i, fs) => f.mass < fs[a].mass ? i : a, 0);
const SMALL = [FILLER, ...BLOOMS.filter(o => o !== FILLER).sort((a, b) => FAM[a.k].forms[smallest(a.k)].mass - FAM[b.k].forms[smallest(b.k)].mass).slice(0, 2)]
  .map(o => ({ k: o.k, form: smallest(o.k) }));
// a middling head, in cells, for laying out the field before anything's chosen
const heads = BLOOMS.flatMap(o => FAM[o.k].forms.map(f => f.head));
const TYP = { w: mid(heads.map(h => h[0].length)), h: mid(heads.map(h => h.length)) };
// what each colourway reads as from across the garden: worked out from the sprite the way accent() reads a stitched one
const PT = new Map();
for (const { forms } of Object.values(FAM)) for (const { head, pals } of forms) for (const pal of pals)
  PT.set(pal, accent([...head.join('')].filter(k => k !== '.' && !'GgLl'.includes(k)).map(k => ({ o: 2, col: pal[k] || pal.P }))));

// of a flower's colourways, the one that stands apart from its neighbours: far round the colour wheel from them
// (the nearest count most: one at the edge of reach gets 60° of slack), and never the colour just planted.
// near: [[tint, 0..1 how far off]]
let lastTint = null;
const hueGap = (a, b) => a < 0 || b < 0 ? 90 : Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
function choosePal(rnd, pals, near = []) {
  if (pals.length < 2) return pals[0];
  const hs = near.map(([t, far]) => [hue(t), far * 60]);
  const score = o => (hs.length ? Math.min(...hs.map(([h, slack]) => hueGap(hue(PT.get(o) || o.P), h) + slack)) : 90) + rnd() * 40 - (o.P === lastTint ? 200 : 0);
  const pal = [...pals].sort((a, b) => score(b) - score(a))[0];
  lastTint = pal.P;
  return pal;
}
// recolour a stitched flower in place: its head cells remember which part of the palette they are
function recolour(fl, pal) {
  fl.pal = pal;
  for (const c of fl.cells) if (c.k && pal[c.k]) c.col = pal[c.k];
  fl.tint = accent(fl.cells);
  return fl;
}

// 1 for the same colour, fading to 0 by 40° round the wheel; whites and greys never clash
const hueNear = (a, b) => { const x = hue(a), y = hue(b); return x < 0 || y < 0 ? 0 : Math.max(0, 1 - hueGap(x, y) / 40); };
// how far apart two flowers read: a step up or down counts a little more than a step across
const reach = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.2);

// a spot's neighbourhood: the flowers within REACH of it (d in cells, stretched by `spread` where a bed is sparse),
// the nearest of those, the kinds a little further round it, how many of each kind the bed has, and how far off
// each showpiece is
function look(at, bed, cell, spread = 1) {
  const near = [], around = {}, have = {}, shows = [];
  for (const f of bed) {
    const r = reach(f, at) / cell, d = r / spread;
    if (d < REACH) near.push({ f, d, size: f.size ?? KIND[f.kind]?.size });
    else if (d < REACH * 2) around[f.kind] = (around[f.kind] || 0) + 1;
    have[f.kind] = (have[f.kind] || 0) + 1;
    if (KIND[f.kind]?.tier === 'show') shows.push(r);
  }
  return { near, around, have, shows, size: bed.length, nn: near.reduce((a, q) => !a || q.d < a.d ? q : a, null) };
}
// how well a kind would sit in that neighbourhood, 0..1
function fitOf({ k, tier, size }, { near, around, shows, nn }) {
  // never beside its own kind, though a small spray may join one other loosely, like a drift in a meadow. and a
  // little less likely for each one further round, so every kind spreads across the garden instead of one corner
  let fit = .65 ** (around[k] || 0);
  const same = near.filter(q => q.f.kind === k);
  for (const q of same) fit *= size === 0 && tier !== 'filler' && same.length < 2 && q.d > REACH / 2 ? .4 : .03;
  // a colour of its own: its best colourway against the neighbours', the nearer ones counting more
  fit *= Math.max(...KIND[k].pals.map(p => near.reduce((a, q) => a * (1 - .7 * (1 - q.d / REACH) * hueNear(PT.get(p), q.f.tint)), 1)));
  // big heads and tall stems don't stand shoulder to shoulder, and the nearest neighbour is a different size
  for (const q of near) if (q.d < CLOSE) {
    if (size === 2 && q.size === 2) fit *= .35;
    if (TALL.has(k) && TALL.has(q.f.kind)) fit *= .5;
  }
  if (nn && nn.d < CLOSE && nn.size === size) fit *= .75;
  // a showpiece wants room of its own, and never another in sight
  if (tier === 'show') fit *= shows.some(d => d < APART) ? 0 : 1 / (1 + near.filter(q => q.d < CLOSE).length * .2);
  return fit;
}
// the gardener's eye. for each kind: how much it's wanted now (its weight, less if it went in lately or the bed
// already has its share) times how well it would sit at `at` (fitOf). returns the kinds that sit nearly as well as
// the best, each with s = want × fit, ready to be dealt. cheap enough to run on every tap
function rank(at, bed, book, { cell, cap = 0, fill = false, spread = 1 }) {
  const n = look(at, bed, cell, spread), snug = fill && n.near.filter(q => q.d < CLOSE * .8).length >= 2;
  const all = BLOOMS.reduce((a, o) => a + o.w, 0);
  const out = Object.values(KIND).map(o => {
    const { k, tier } = o;
    // wanted: back of the deck if it went in lately, and less again once the bed has more than its share
    let want = tier === 'filler' ? (snug ? o.w : 0) : o.w;
    want *= Math.min(1, (book.n - (book.last[k] ?? -1e9)) / book.mem) ** 2;
    const over = (n.have[k] || 0) - o.w / all * (n.size + 1);
    if (tier !== 'filler') want *= over > 0 ? (1 + over) ** -1.5 : 1 + Math.min(.6, -over * .3);
    // a showpiece waits out the gap, then grows likelier the longer it's been, so one turns up every so often
    if (tier === 'show') want *= n.shows.length >= cap || book.n - book.showAt < SHOW.gap ? 0 : Math.min(3, 1 + (book.n - book.showAt - SHOW.gap) / 8);
    const fit = want > 0 ? fitOf(o, n) : 0;
    return { k, want, fit, s: want * fit };
  });
  const best = Math.max(0, ...out.map(c => c.fit));
  return out.filter(c => c.s > 0 && c.fit >= best * .45);
}
// a weighted shuffle: the likelier kinds tend to come first, but anything in the running can
const deal = (rnd, list) => list.map(c => ({ c, key: rnd() ** (1 / c.s) })).sort((a, b) => b.key - a.key).map(e => e.c);
// how readily a flower takes a spot a step or more off the tap so it covers no one: right there, one step ... four
const RING = [1, .8, .6, .4, .25];

// build one plant: every cell in grid units from the head's centre, in stitch order. the greens, stem, leaves and
// grass draw on rnd first and the head after, so the same rnd grows the same plant whatever head it ends up wearing:
//   buildFlower(mulberry(f.seed), f.kind, { form, pal: f.pal, green: f.green, seed: f.seed })
// regrows f as another form (an index into its family's forms; a random one when not given). pal and green are kept
// when given, seed is only recorded (sow() makes one). root is the cell just under the stem, where it meets the ground
function buildFlower(rnd, kind, { form, pal, green, seed } = {}) {
  if (!FAM[kind]) kind = pickW(rnd, BLOOMS).k;
  const g = GREENS[Math.floor(rnd() * GREENS.length)];
  green = green || g;
  // the stem first, from just under the head down (row 0 is its top), before anything knows how big the head is
  const stalk = [], stem = (x, y, col, d = -y) => stalk.push({ x, y, col, o: 0, d }), leaf = (x, y, col, d) => stalk.push({ x, y, col, o: 1, d });
  const len = TALL.has(kind) ? 7 + Math.floor(rnd() * 6) : 4 + Math.floor(rnd() * 7);
  // most stems lean a step somewhere on the way down, so no two stand quite alike
  const kink = len > 4 && rnd() < .6 ? 2 + Math.floor(rnd() * (len - 3)) : -1, lean = rnd() < .5 ? -1 : 1;
  let side = rnd() < .5 ? -1 : 1, x = 0, bud = len > 5 && rnd() < .3, gap = 1;
  for (let y = 0; y < len; y++) {
    if (y === kink) { stem(x, y, green.G, -y + .5); x += lean; }
    stem(x, y, y % 4 === 3 ? green.g : green.G);
    // leaves come every few cells, alternating sides
    if (y < 2 || y >= len - 1 || --gap > 0 || rnd() > .55) continue;
    gap = 3;
    // now and then a side shoot carries a green bud, just showing the flower's colour at its tip
    if (bud && y >= 3) {
      leaf(x + side, y, green.L, -y + .1); leaf(x + side * 2, y - 1, green.L, -y + .2);
      leaf(x + side * 2, y - 2, green.L, -y + .3);
      stalk.push({ x: x + side * 2, y: y - 3, k: 'P', o: 1, d: -y + .4 });
      bud = false;
    } else {
      const shape = LEAVES[Math.floor(rnd() * LEAVES.length)];
      shape.forEach(([lx, ly, k], j) => leaf(x + side * lx, y + ly, green[k], -y + j * .1));
    }
    side = -side;
  }
  // where the stem meets the ground: a tuft of grass, tall blades either side, or nothing at all
  const y = len - 1, base = rnd();
  if (base < .3) {
    [[-1, 'L'], [1, 'G'], [-2, 'g'], [2, 'l']].forEach(([dx, k], j) => { if (j < 2 || rnd() < .6) stem(x + dx, y, green[k], -y - .5 + j * .1); });
    stem(x + (rnd() < .5 ? -1 : 1), y - 1, green.l, -y + .7);
  } else if (base < .55) {
    for (const s of [-1, 1]) if (s === side || rnd() < .5) [[1, 0], [1, -1], [2, -2], [2, -3]].forEach(([dx, dy], j) => stem(x + s * dx, y + dy, j % 2 ? green.l : green.L, -y - .5 + j * .1));
  }
  // then the head: a form of the family, and any colourway for now (it's recoloured to suit its neighbours once it
  // knows where it'll stand)
  const forms = FAM[kind].forms;
  form = forms[form] ? form : Math.floor(rnd() * forms.length);
  const { head, pals, foot, size } = forms[form];
  pal = pal || pals[Math.floor(rnd() * pals.length)];
  const hw = head[0].length, hh = head.length, ox = Math.floor(hw / 2), oy = Math.floor(hh / 2);
  const cells = [];
  // green worked into a head stitches with the leaves, but still sways with the bloom
  head.forEach((row, r) => [...row].forEach((k, c) => {
    if (k === '.') return;
    const d = Math.hypot(c - ox, (r - oy) * 1.1);
    cells.push(green[k] ? { x: c - ox, y: r - oy, col: green[k], o: 1, d: oy - r, hd: 1 } : { x: c - ox, y: r - oy, k, col: pal[k] || pal.P, o: 2, d, hd: 1 });
  }));
  // the stem hangs from the head's foot column
  const top = hh - oy, fx = (foot ?? ox) - ox;
  for (const c of stalk) cells.push({ ...c, x: c.x + fx, y: c.y + top, d: c.d - top, ...(c.k && { col: pal[c.k] || pal.P }) });
  cells.sort((a, b) => a.o - b.o || a.d - b.d);
  const bottom = Math.max(...cells.map(c => c.y));
  const xs = cells.map(c => c.x);
  return { kind, form, pal, green, seed, pals, size, cells, tint: accent(cells), r: Math.max(hw, hh) / 2, bottom, top: -oy,
    box: [Math.min(...xs), -oy, Math.max(...xs), bottom], hb: [-ox, -oy, hw - 1 - ox, hh - 1 - oy], root: [x + fx, len + top] };
}
// a new plant with a seed of its own, so it can be regrown later (see buildFlower)
const sow = (rnd, kind, opts) => { const seed = Math.floor(rnd() * 4294967296); return buildFlower(mulberry(seed), kind, { ...opts, seed }); };

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
  const live = [], dying = [], sparks = [], petals = [];
  // the flower under the pointer (leaning towards it) and the one being pressed (dipped a stitch)
  let hovered = null, pressed = null, pressT = 0, liftT = 0;
  // the gardener's notebook: how many have been planted, when each kind last went in, and when the last showpiece did
  const book = { n: 0, last: {}, showAt: 0, mem: MEMORY };
  let nextId = 1, ripenT = 0, userPlanted = false, fieldPlanted = false, fieldW = 0, fieldH = 0, timers = [];
  let cssW = 0, cssH = 0, dpr = 1, cell = 6, grain = null, grainPat = null;
  let raf = 0, visible = true, destroyed = false, breeze = null, breezeT = 0, sparkT = 0, dirty = true, growing = false;
  const api = { onChange: opts.onChange, plant, patches: () => live.map(pub), flowerAt: (x, y, slop) => { const f = hit(x, y, slop); return f && pub(f); },
    press, release, hover, clear, destroy, _stats: { frames: 0 } };
  const pub = f => ({ id: f.id, kind: f.kind, form: f.form, x: f.x, y: f.y, flowers: [{ x: f.x, y: f.y, r: f.r * f.u + 2 }] });
  const unit = () => cell;
  const changed = () => api.onChange?.(api.patches());
  const now = () => performance.now();

  function size() {
    const b = canvas.getBoundingClientRect();
    cssW = b.width; cssH = b.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cell = Math.round((cssW <= 640 ? CELL.phone : CELL.desk) * dpr) / dpr;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    if (!grain) grain = noiseTile(128);
    grainPat = ctx.createPattern(grain, 'repeat');
    // positions stay in CSS px (a cell's middle); re-snap them to the new grid. a turn in progress just lands
    for (const f of live) { f.u = unit(f); f.gx = Math.floor(f.x / f.u); f.gy = Math.floor(f.y / f.u); f.morph = null; seat(f); }
    dirty = true;
  }

  // a plant stands with its head at (gx, gy); its base is the ground cell under its stem. a regrown plant (same seed,
  // another form) keeps the base and moves the head: gx = base.gx - fl.root[0], gy = base.gy - fl.root[1]
  const seat = f => { f.base = { gx: f.gx + f.root[0], gy: f.gy + f.root[1] }; return f; };
  function add(x, y, rnd, t0, kind) {
    const fl = typeof kind === 'object' ? kind : sow(rnd, kind);
    const u = unit(fl);
    const f = { id: nextId++, x, y, u, gx: Math.round(x / u), gy: Math.round(y / u), ...fl, t0, step: Math.min(STEP, 900 / fl.cells.length), shown: reduced ? Infinity : 0, sway: 0 };
    f.x = f.gx * u + u / 2; f.y = f.gy * u + u / 2;
    seat(f);
    live.push(f);
    ripen(f, t0);
    tend();
    // drawn back to front, so lower plants stand in front of higher ones
    live.sort((a, b) => (a.gy + a.bottom) - (b.gy + b.bottom));
    if (!reduced) growing = true;
    return f;
  }

  // the garden looks after itself. once it's properly full, the oldest flower quietly unpicks, stitch by stitch
  // in reverse over about three seconds, then a few seconds later the next oldest, until there's room again.
  // planting doesn't knock anything out; the garden just slowly makes space on its own clock
  let tendT = 0;
  const cap = () => cssW <= 640 ? FULL.phone : FULL.desk;
  function unpick(old, at = now()) {
    live.splice(live.indexOf(old), 1);
    old.shown = old.cells.length;
    old.dieAt = at;
    old.dstep = Math.min(85, 3000 / old.cells.length);
    old.morph = null; old.lean = old.dip = 0;
    dying.push(old);
  }
  // a flower someone's just been tapping counts as new again
  const age = f => f.touched ?? f.id;
  const oldest = () => live.reduce((a, b) => age(a) < age(b) ? a : b);
  function tend() {
    // someone planting very fast can't pile up forever: way past full, the oldest go straight away (still unpicking)
    while (live.length > cap() + 14) unpick(oldest());
    if (tendT || live.length <= cap()) return;
    tendT = setTimeout(() => {
      tendT = 0;
      if (live.length > cap()) { unpick(oldest()); dirty = true; wake(); changed(); }
      tend();
    }, live.length > cap() + 6 ? 2200 : 4200);
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
  const overlaps = (bx, boxes, k) => boxes.some(ob => Math.max(0, Math.min(bx[2], ob[2]) - Math.max(bx[0], ob[0])) * Math.max(0, Math.min(bx[3], ob[3]) - Math.max(bx[1], ob[1]))
    > k * Math.min((bx[2] - bx[0]) * (bx[3] - bx[1]), (ob[2] - ob[0]) * (ob[3] - ob[1])));
  const clash = (bx, others) => overlaps(bx, others.map(o => boxAt(o, o.x, o.y)), .1);
  // the live flower under (x, y), the front-most where they overlap, or null: tells a tap on a flower from a tap on
  // bare soil. its head counts with a cell to spare all round, and so does anywhere within a stitch or so of its stalk.
  // one of the opening field's that hasn't started stitching yet is still bare soil. failing all that, the nearest head
  // within `slop` px, so a fingertip that lands just off a flower still finds it
  function hit(x, y, slop = 0) {
    const t = now();
    let near = null, gap = slop;
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i], [a, b, c, d] = f.hb, hx = x / f.u - f.gx, hy = y / f.u - f.gy;
      if (t < f.t0) continue;
      if (hx >= a - 1 && hx < c + 2 && hy >= b - 1 && hy < d + 2) return f;
      if (f.cells.some(q => !q.hd && Math.abs(q.x + .5 - hx) < 1.5 && Math.abs(q.y + .5 - hy) < 1.5)) return f;
      const g = Math.hypot(Math.max(a - hx, 0, hx - c - 1), Math.max(b - hy, 0, hy - d - 1)) * f.u;
      if (g < gap) { near = f; gap = g; }
    }
    return near;
  }

  // ---- the pointer: a flower under it leans towards it, and one pressed dips a stitch, the moment it happens --------
  function hover(x, y) {
    const f = x < 0 ? null : hit(x, y);
    if (f !== hovered) {
      if (hovered) hovered.lean = 0;
      // it leans the way the pointer came in from, and stays that way while the pointer's on it
      if (f && !reduced) f.lean = x < f.x ? -1 : 1;
      hovered = f; dirty = true; wake();
    }
    return !!f;
  }
  function press(x, y, slop) {
    release(0);
    const f = hit(x, y, slop);
    if (f && !reduced) { pressed = f; pressT = now(); f.dip = 1; dirty = true; wake(); }
    return f && pub(f);
  }
  // let go: it springs back up, though never before it's been seen down for a couple of frames
  function release(hold = 70) {
    clearTimeout(liftT);
    const f = pressed;
    if (!f) return;
    pressed = null;
    const up = () => { f.dip = 0; dirty = true; wake(); };
    const left = hold - (now() - pressT);
    if (left > 0) liftT = setTimeout(up, left); else up();
  }
  // reads the neighbourhood before choosing (see rank): a kind that suits the spot and the bed, a colour that stands
  // apart from the neighbours', and a spot a step or two off the tap if that's what keeps it from covering anyone.
  // a kind that would have to shuffle off the tap only takes the spot now and then, so in a tight gap something
  // smaller usually wins; squeezed in between bigger blooms, a tiny one tucks in
  function choose(x, y) {
    const at = { x, y };
    const crowd = live.filter(f => Math.abs(f.x - x) < 44 * cell && Math.abs(f.y - y) < 52 * cell);
    const spots = [[x, y]];
    for (let d = 1; d <= 6; d++) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + d; spots.push([x + Math.cos(a) * d * cell * 3, y + Math.sin(a) * d * cell * 2.4]); }
    const room = (fl, p) => { const bx = boxAt(fl, p[0], p[1]); return bx[0] > 2 && bx[2] < cssW - 2 && bx[3] < cssH - 2 && !clash(bx, crowd); };
    // any form of the family, except that one that grows starts out small
    const grow = (k, rings = 4, form = FAM[k].grows ? 0 : undefined) => { const fl = sow(Math.random, k, { form }), i = spots.findIndex((p, j) => j <= rings * 8 && room(fl, p));
      return i < 0 ? null : { fl, p: spots[i], ring: Math.ceil(i / 8) }; };
    const dealt = deal(Math.random, rank(at, live, book, { cell, cap: SHOW.live[cssW <= 640 ? 'phone' : 'desk'], fill: true }));
    let pick = null, spare = null;
    for (const c of dealt) {
      const g = grow(c.k);
      if (g && Math.random() < RING[g.ring]) { pick = g; break; }
      if (g && (!spare || g.ring < spare.ring)) spare = g;
    }
    pick = pick || spare;
    // crowded all round: the smallest kinds that aren't already next door, then a proper flower a couple of steps
    // further out, then whatever small thing fits at all, and failing everything a tiny one right where they tapped
    const next = k => live.some(f => f.kind === k && reach(f, at) < REACH * cell);
    for (const o of SMALL) if (!next(o.k)) pick = pick || grow(o.k, 4, o.form);
    for (const c of dealt) pick = pick || grow(c.k, 6);
    for (const o of [...SMALL].sort((a, b) => next(a.k) - next(b.k))) pick = pick || grow(o.k, 6, o.form);
    pick = pick || { fl: sow(Math.random, SMALL[0].k, { form: SMALL[0].form }), p: [x, y] };
    // its colour answers the neighbours' where it actually lands
    const to = { x: pick.p[0], y: pick.p[1] }, far = f => reach(f, to) / cell / REACH;
    return { fl: recolour(pick.fl, choosePal(Math.random, pick.fl.pals, live.filter(f => far(f) < 1).map(f => [f.tint, far(f)]))), ...to };
  }

  function plant(x, y, slop) {
    userPlanted = true;
    timers.forEach(clearTimeout); timers = [];
    // a tap on a flower that's already there turns it, instead of planting another on top
    const on = hit(x, y, slop);
    if (on) {
      const how = turn(on);
      opts.onMorph?.(on, how);
      wake(); changed();
      return { ...pub(on), morphed: how };
    }
    const pick = choose(x, y), k = pick.fl.kind;
    x = pick.x; y = pick.y;
    book.n++; book.last[k] = book.n;
    if (KIND[k]?.tier === 'show') book.showAt = book.n;
    const f = add(x, y, Math.random, now(), pick.fl);
    opts.onBloom?.(f);
    // two sparkles wink either side of it as it opens
    twinkle(f, 2, f.cells.length * f.step * .75);
    opts.onSparkle?.(f.cells.length * f.step * .75, f.x);
    if (reduced) setTimeout(() => opts.onGrown?.());
    wake(); changed();
    return pub(f);
  }

  // ---- a flower turning into another of its kind -------------------------------------------
  // what a flower could become next, best first: on through its family's forms in order, and once round them all, its
  // next colourway too (a family that grows lists its forms smallest first, so it fills out, then starts small again in
  // a new colour). last of all the same form in its next colourway, which always fits
  function* nexts(f) {
    const { forms } = FAM[f.kind], n = forms.length, pi = Math.max(0, forms[f.form].pals.indexOf(f.pal));
    for (let d = 1; d < n; d++) { const form = (f.form + d) % n; yield { form, pi: form < f.form ? pi + 1 : pi }; }
    yield { form: f.form, pi: pi + 1 };
  }
  // the same stalk from the same seed, with another head on top
  const regrow = (f, { form, pi }) => { const pals = FAM[f.kind].forms[form].pals; return buildFlower(mulberry(f.seed), f.kind, { form, pal: pals[pi % pals.length], green: f.green, seed: f.seed }); };
  // a new head has to fit where the plant stands: on the canvas, off the type, and over no neighbour. anything the old
  // one already did (someone planted it right by the name, say) it may keep doing
  function roomFor(f, fl) {
    const u = f.u, x = (f.base.gx - fl.root[0]) * u + u / 2, y = (f.base.gy - fl.root[1]) * u + u / 2;
    const others = live.filter(o => o !== f), type = opts.field?.(cssW, cssH, cssW <= 640)?.avoid || [];
    const tests = [b => b[0] < 2 || b[1] < 2 || b[2] > cssW - 2 || b[3] > cssH - 2, b => clash(b, others),
      b => type.some(([l, t, r, d]) => b[2] > l && b[0] < r && b[3] > t && b[1] < d)];
    const nb = boxAt(fl, x, y), ob = boxAt(f, f.x, f.y);
    return tests.every(bad => !bad(nb) || bad(ob));
  }
  // regrow f in place as the first of its next selves that has room, the base where it was. a head the same size as
  // the old one (within a stitch each way, since odd and even widths centre differently) ripples in; a bigger or
  // smaller one scatters (see plan)
  function turn(f, quiet = false) {
    let fl;
    for (const step of nexts(f)) { fl = regrow(f, step); if (roomFor(f, fl)) break; }
    const [a, b, c, d] = f.hb, [p, q, r, s] = fl.hb;
    const how = Math.abs(c - a - (r - p)) <= 1 && Math.abs(d - b - (s - q)) <= 1 ? 'ripple' : 'scatter';
    // tapped again mid-turn, it carries on from whatever's showing; tapped while still stitching in, from the
    // stitches it has so far
    const m = f.morph, e = m && now() - m.t0;
    const was = m ? [...m.keep, ...m.out.filter(c => e < c.at), ...m.in.filter(c => e >= c.at)]
      : f.cells.slice(0, Math.max(0, Math.floor((now() - f.t0) / f.step) + 1)).filter(c => c.hd).map(c => ({ gx: f.gx + c.x, gy: f.gy + c.y, col: c.col, k: c.k }));
    const gx = f.base.gx - fl.root[0], gy = f.base.gy - fl.root[1];
    Object.assign(f, fl, { gx, gy, x: gx * f.u + f.u / 2, y: gy * f.u + f.u / 2, t0: -1e9, shown: fl.cells.length, step: Math.min(STEP, 900 / fl.cells.length) });
    if (!quiet) f.touched = nextId++;
    f.morph = reduced ? null : plan(f, was, how);
    if (!reduced && !quiet) twinkle(f, how === 'ripple' ? 1 : 2, f.morph.end * .6);
    ripen(f);
    dirty = true;
    return how;
  }
  // when each old stitch goes and each new one comes, in ms. ripple: a ring runs out from the middle, quick at first
  // and settling at the rim, and each stitch turns as it passes; then a fainter ring runs back in over the new head.
  // scatter: here and there, most of them early, like a fizz. a stitch both heads share stays put, and one that just
  // changes colour changes as the ring or the fizz reaches it. a turn that would change nothing (a one-colour flower
  // with no room to grow, say) flashes every stitch anyway, so a tap always answers
  function plan(f, was, how) {
    const ink = f.cells.filter(c => c.hd).map(c => ({ gx: f.gx + c.x, gy: f.gy + c.y, col: c.col, k: c.k }));
    const all = [...was, ...ink], xs = all.map(c => c.gx), ys = all.map(c => c.gy);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const R = Math.max(1, ...all.map(c => Math.hypot(c.gx - cx, c.gy - cy))), rr = c => Math.hypot(c.gx - cx, c.gy - cy) / R;
    const D = TURNS[how], ripple = how === 'ripple';
    const at = ripple ? c => (1 - Math.sqrt(1 - rr(c))) * D * .6 : () => Math.random() ** 2 * D;
    const id = c => c.gx + ',' + c.gy;
    const old = new Map(was.map(c => [id(c), c.col]));
    let keep = ink.filter(c => old.get(id(c)) === c.col), into = ink.filter(c => old.get(id(c)) !== c.col);
    if (!into.length) { keep = []; into = ink; }
    for (const c of into) { c.at = at(c); if (ripple) c.back = D * (.6 + (1 - rr(c)) * .4); }
    const kept = new Set(keep.map(id)), comes = new Map(into.map(c => [id(c), c.at]));
    const out = was.filter(c => !kept.has(id(c))).map(c => ({ ...c, at: comes.get(id(c)) ?? at(c) }));
    return { t0: now(), end: D + FLASH_MS, keep, out, in: into };
  }
  // growing families ripen on their own clock: one timer for the whole garden, set for whichever is due first. one
  // that's full (its next stage would start it small again), or with no room to grow, waits longer. with reduced
  // motion they stay put
  function ripen(f, from = now()) {
    if (!FAM[f.kind]?.grows || reduced) return;
    const s = nexts(f).next().value, full = s.form <= f.form || !roomFor(f, regrow(f, s)), [a, b] = full ? RIPEN.full : RIPEN.stage;
    f.ripeAt = Math.max(from, now()) + a + Math.random() * (b - a);
    tick();
  }
  function tick() {
    clearTimeout(ripenT);
    if (destroyed) return;
    const due = live.reduce((m, f) => f.ripeAt ? Math.min(m, f.ripeAt) : m, Infinity);
    if (due === Infinity) return;
    ripenT = setTimeout(() => {
      // nothing grows while nobody's looking; it carries on a moment after they're back
      const t = now(), away = !visible || document.hidden;
      for (const f of live) if (f.ripeAt && f.ripeAt <= t + 16) {
        if (away) f.ripeAt = t + 3000 + Math.random() * 3000;
        else turn(f, true);
      }
      wake(); changed(); tick();
    }, Math.max(16, due - now()));
  }

  // the opening field: a designed bed with some chance in it, kept off the type. n sites spread evenly, each the
  // best of a couple of dozen random spots (furthest from those already chosen, so blue noise, never a grid). the
  // showpieces take the roomiest site either side of the middle, the rest are dealt kinds the way a planting is
  // (rank) so no neighbours match and nothing repeats until every kind has had a turn, then a tiny filler or two
  // tucks in at the feet of the blooms. seeded, so a screen size always opens on the same garden
  function plantField() {
    fieldPlanted = true; fieldW = cssW; fieldH = cssH; lastTint = null;
    const mob = cssW <= 640;
    const o = opts.field?.(cssW, cssH, mob) || {};
    const [x0, y0, x1, y1] = o.rect || [24, cssH * .5, cssW - 24, cssH * .9];
    const avoid = o.avoid || [];
    const n = o.n ?? (mob ? 14 : 22);
    const rnd = mulberry(mob ? 7 : 11), frnd = mulberry(3);
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(frnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // the whole plant keeps off the type, not just its head; plants may brush leaves, but never stand in front of each other
    const bed = [];
    const pad = (fl, s) => { const [a, b, c, d] = boxAt(fl, s.x, s.y); return [a - 6, b - 6, c + 6, d]; };
    const fits = (fl, s, skip = []) => { const bx = pad(fl, s);
      return bx[0] >= 4 && bx[2] <= cssW - 4 && bx[3] <= cssH - 4 && !avoid.some(([a, b, c, d]) => bx[2] > a && bx[0] < c && bx[3] > b && bx[1] < d)
        && !overlaps(bx, bed.filter(p => !skip.includes(p)).map(p => p.bx), .12); };
    const typ = { box: [-TYP.w / 2 - 2, -TYP.h / 2, TYP.w / 2 + 2, TYP.h / 2 + 8] };
    const sites = [];
    for (let i = 0; i < n; i++) {
      let best = null, far = -1;
      for (let j = 0; j < 24; j++) {
        const s = { x: x0 + rnd() * (x1 - x0), y: y0 + rnd() * (y1 - y0) };
        const d = fits(typ, s) ? Math.min(Infinity, ...sites.map(t => Math.hypot(t.x - s.x, (t.y - s.y) * 1.3))) : -1;
        if (d > far) { best = s; far = d; }
      }
      if (best) sites.push(best);
    }
    // the field is sparser than a planted-up garden, so its neighbourhoods stretch to match
    const spread = Math.max(1, Math.sqrt((x1 - x0) * (y1 - y0) / Math.max(1, n)) / cell / 26);
    const fbook = { n: 0, last: {}, showAt: -1e9, mem: BLOOMS.length };
    // its colour answers the neighbours' (they all open together, so there's no colour just planted to steer off)
    const colour = s => { const far = p => reach(p, s) / cell / spread / REACH; lastTint = null;
      recolour(s.fl, choosePal(frnd, s.fl.pals, bed.filter(p => p !== s && far(p) < 1).map(p => [p.tint, far(p)]))); s.tint = s.fl.tint; };
    const set = (s, fl) => {
      Object.assign(s, { fl, kind: fl.kind, size: fl.size, bx: pad(fl, s) });
      colour(s); bed.push(s);
      fbook.last[fl.kind] = ++fbook.n;
    };
    const sit = s => fitOf(KIND[s.kind], look(s, bed.filter(p => p !== s), cell, spread));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const room = s => Math.min(Infinity, ...sites.filter(t => t !== s).map(t => reach(t, s)));
    const shows = shuffle(BLOOMS.filter(o => o.tier === 'show').map(o => o.k)).slice(0, Math.min(SHOW.field[mob ? 'phone' : 'desk'], Math.floor(n / 5)));
    shows.forEach((k, i) => {
      const fl = sow(frnd, k), side = shows.length > 1 ? i % 2 : -1;
      const s = sites.filter(s => !s.fl && (side < 0 || (s.x > cx) === !!side) && bed.every(p => reach(p, s) / cell >= APART))
        .sort((a, b) => room(b) - room(a)).find(s => fits(fl, s));
      if (s) set(s, fl);
    });
    const middle = (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy);
    for (const s of sites.filter(s => !s.fl).sort(middle)) {
      for (const c of [...deal(frnd, rank(s, bed, fbook, { cell, spread })), ...SMALL.slice(1)]) {
        const fl = sow(frnd, c.k, { form: c.form });
        if (fits(fl, s)) { set(s, fl); break; }
      }
    }
    // then the gardener steps back: any two plants that would each sit better where the other stands (no like
    // neighbours, colours further apart, big heads further from each other) swap, if both still fit there
    const swap = (a, b) => { [a.fl, b.fl] = [b.fl, a.fl]; for (const s of [a, b]) Object.assign(s, { kind: s.fl.kind, tint: s.fl.tint, size: s.fl.size, bx: pad(s.fl, s) }); };
    const loose = bed.filter(s => KIND[s.kind].tier !== 'show');
    for (let round = 0, moved = 1; round < 3 && moved; round++) moved = loose.reduce((m, a, i) => loose.slice(i + 1).reduce((m, b) => {
      if (a.kind === b.kind) return m;
      const was = sit(a) * sit(b);
      swap(a, b);
      if (sit(a) * sit(b) > was * 1.05 && fits(a.fl, a, [a, b]) && fits(b.fl, b, [a, b]) && !overlaps(a.bx, [b.bx], .12)) return 1;
      swap(a, b);
      return m;
    }, m), 0);
    // and with everyone in place, each picks its colourway again against all its neighbours
    for (const s of bed) colour(s);
    // a tiny one or two at the feet of a bloom, on the side facing its nearest neighbour, wherever one suits the spot
    const blooms = bed.filter(s => KIND[s.kind]?.size > 0);
    for (let i = 0, t = 0; i < Math.round(n / 6) && t < 40 && blooms.length > 1; t++) {
      const a = blooms[Math.floor(rnd() * blooms.length)], b = blooms.filter(s => s !== a).sort((p, q) => reach(p, a) - reach(q, a))[0];
      const k = .3 + rnd() * .2, s = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + cell * (3 + rnd() * 5) };
      const fl = sow(frnd, FILLER.k);
      if (fitOf(FILLER, look(s, bed, cell, spread)) < .7 || !fits(fl, s)) continue;
      set(s, fl); i++;
    }
    const start = now();
    // grow one at a time, from the middle outwards, each one sparkling as it opens
    const pts = bed.sort(middle);
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
    clearTimeout(tendT); tendT = 0; clearTimeout(ripenT);
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
      // the head (and the top of the stalk) leans in a breeze or towards the pointer; a pressed head dips a stitch
      const lean = f.sway || f.lean || 0, dip = f.dip || 0;
      for (let i = 0; i < n; i++) {
        const c = f.cells[i];
        const dx = c.hd || (c.o === 0 && c.y <= f.top + 1) ? lean : 0;
        // the newest stitch flashes paler for a step
        rect(f.gx + c.x + dx, f.gy + c.y + (c.hd ? dip : 0), i >= n - fresh && n < f.cells.length ? FLASH : c.col, f.u);
      }
    };
    const ds = f => f.dstep || STEP * .6;
    for (const f of dying) {
      const k = f.cells.length - Math.max(0, Math.floor((t - f.dieAt) / ds(f)));
      if (k > 0) { paint(f, k); busy = true; }
    }
    for (let i = dying.length - 1; i >= 0; i--) if ((t - dying[i].dieAt) / ds(dying[i]) > dying[i].cells.length) dying.splice(i, 1);
    for (const f of live) {
      if (t < f.t0) { busy = true; continue; }
      // turning: the stalk as it stands, the old head going stitch by stitch and the new one coming, each new stitch
      // flashing pale as it lands (and in a ripple, again for a moment as the ring comes back through)
      const m = f.morph;
      if (m && t - m.t0 > m.end) f.morph = null;
      else if (m) {
        const e = t - m.t0, dx = f.sway || f.lean || 0, dy = f.dip || 0;
        const lit = c => e - c.at < FLASH_MS || (c.back !== undefined && e >= c.back && e - c.back < FLASH_MS * .6);
        for (const c of f.cells) if (!c.hd) rect(f.gx + c.x, f.gy + c.y, c.col, f.u);
        for (const c of m.keep) rect(c.gx + dx, c.gy + dy, c.col, f.u);
        for (const c of m.out) if (e < c.at) rect(c.gx + dx, c.gy + dy, c.col, f.u);
        for (const c of m.in) if (e >= c.at) rect(c.gx + dx, c.gy + dy, lit(c) ? FLASH : c.col, f.u);
        busy = true;
        continue;
      }
      const k = reduced ? f.cells.length : Math.floor((t - f.t0) / f.step) + 1;
      if (k > f.shown && f.shown < f.cells.length) { opts.onStitch?.(f); f.shown = k; }
      if (k < f.cells.length) busy = true;
      paint(f, k);
    }
    // loose petals fall a stitch at a time in front of everything, swaying side to side
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i], e = t - p.t0;
      if (e < 0) { busy = true; continue; }
      if (e > p.life) { petals.splice(i, 1); continue; }
      const fall = Math.floor(e / 62);
      rect(p.gx + (Math.floor(fall / 3) % 2 ? p.side : 0), p.gy + fall, p.col);
      busy = true;
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
      // how far the front has passed this flower, whichever side it came from
      const d = breeze.dir > 0 ? front - f.x : f.x - (cssW - front);
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
    const turning = live.some(f => f.morph);
    const due = sparks.some(s => t >= s.t0) || live.some(f => f.shown < f.cells.length) || dying.length || petals.length || turning;
    if (dirty || due || b) {
      // stitches land at the step rate; nothing needs 60fps here
      if (t - lastStep >= 24 || dirty) { lastStep = t; dirty = false; draw(t); }
    }
    const next = sparks.reduce((m, s) => Math.min(m, s.t0), Infinity);
    const sprouting = live.some(f => f.shown < f.cells.length);
    if (growing && !sprouting && live.length) opts.onGrown?.();
    growing = sprouting;
    const busy = sprouting || turning || dying.length || petals.length || b || sparks.some(s => t >= s.t0);
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
    destroyed = true; cancelAnimationFrame(raf); clearTimeout(breezeT); clearTimeout(sparkT); clearTimeout(tendT); clearTimeout(ripenT); clearTimeout(liftT);
    timers.forEach(clearTimeout); ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  }
  return api;
}
