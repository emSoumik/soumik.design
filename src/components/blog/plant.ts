// one plant from the garden's own sprites, every cell in stitch order: the stem from the ground up, its leaves, then
// the head from the middle out. the same order buildFlower() in js/garden/pixels.js stitches in, kept small and
// seeded so a header or a demo draws the same plant at build time and in the browser
import { FLOWERS } from '../../../js/garden/flora.js';

export type Cell = { x: number; y: number; col: string; o: 0 | 1 | 2 };
export type Plant = { kind: string; cells: Cell[]; box: [number, number, number, number] };
type Form = { head: string[]; pals: Record<string, string>[]; foot?: number };

const FAM = FLOWERS as unknown as Record<string, { forms: Form[] }>;
export const KINDS = Object.keys(FAM).filter((k) => k !== 'mini');

// the garden's greens and leaf shapes (same values as pixels.js)
const GREENS = [
  { G: '#2f8f3e', g: '#1d6b2c', L: '#45a84f', l: '#86d06c' },
  { G: '#3c8f2a', g: '#2b6e1e', L: '#6dbb45', l: '#a6dc6a' },
  { G: '#1d7d5c', g: '#145e45', L: '#3aa57c', l: '#74cfa2' },
];
const LEAVES: [number, number, 'L' | 'l' | 'g'][][] = [
  [[1, 0, 'L'], [2, 0, 'L'], [2, -1, 'l'], [3, -1, 'L']],
  [[1, 0, 'L'], [1, -1, 'l'], [2, -1, 'L'], [2, -2, 'l'], [3, -2, 'L']],
  [[1, 0, 'L'], [2, 0, 'l'], [3, 0, 'L'], [2, 1, 'g']],
  [[1, 0, 'l'], [2, 1, 'L'], [3, 1, 'L']],
];
const TALL = new Set(['sunflower', 'allium', 'lily', 'iris']);

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const forms = (kind: string) => FAM[kind].forms;

// just a head, centred on (0, 0): for the specimen sheet and tiny stills
export function head(kind: string, form = 0, pal = 0): Cell[] {
  const f = FAM[kind].forms[form % FAM[kind].forms.length], p = f.pals[pal % f.pals.length], g = GREENS[0] as Record<string, string>;
  const ox = Math.floor(f.head[0].length / 2), oy = Math.floor(f.head.length / 2);
  const cells: Cell[] = [];
  f.head.forEach((row, r) => [...row].forEach((k, c) => {
    if (k === '.') return;
    cells.push(g[k] ? { x: c - ox, y: r - oy, col: g[k], o: 1 } : { x: c - ox, y: r - oy, col: p[k] || p.P, o: 2 });
  }));
  return cells;
}

// a whole plant, head centred on (0, 0) and the stem hanging below it
export function grow(kind: string, { seed = 1, form = 0, pal = 0, green, len }: { seed?: number; form?: number; pal?: number; green?: number; len?: number } = {}): Plant {
  const rnd = mulberry(seed);
  const gr = GREENS[green ?? Math.floor(rnd() * GREENS.length)] as Record<string, string>;
  const f = FAM[kind].forms[form % FAM[kind].forms.length], p = f.pals[pal % f.pals.length];
  const hw = f.head[0].length, hh = f.head.length, ox = Math.floor(hw / 2), oy = Math.floor(hh / 2);
  const n = len ?? (TALL.has(kind) ? 7 + Math.floor(rnd() * 5) : 4 + Math.floor(rnd() * 6));
  // [cell, order]: o first (stem, leaf, petal), then d: stems from the ground up, petals from the middle out
  const out: [Cell, number][] = [];
  const top = hh - oy, fx = (f.foot ?? ox) - ox;
  let side = rnd() < .5 ? -1 : 1, gap = 1;
  for (let y = 0; y < n; y++) {
    out.push([{ x: fx, y: y + top, col: y % 4 === 3 ? gr.g : gr.G, o: 0 }, -y]);
    if (y < 2 || y >= n - 1 || --gap > 0 || rnd() > .6) continue;
    gap = 3;
    LEAVES[Math.floor(rnd() * LEAVES.length)].forEach(([lx, ly, k], j) => out.push([{ x: fx + side * lx, y: y + top + ly, col: gr[k], o: 1 }, -y + j * .1]));
    side = -side;
  }
  f.head.forEach((row, r) => [...row].forEach((k, c) => {
    if (k === '.') return;
    if (gr[k]) out.push([{ x: c - ox, y: r - oy, col: gr[k], o: 1 }, oy - r]);
    else out.push([{ x: c - ox, y: r - oy, col: p[k] || p.P, o: 2 }, Math.hypot(c - ox, (r - oy) * 1.1)]);
  }));
  out.sort((a, b) => a[0].o - b[0].o || a[1] - b[1]);
  const cells = out.map((e) => e[0]);
  const xs = cells.map((c) => c.x), ys = cells.map((c) => c.y);
  return { kind, cells, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

// cells as svg rects, runs of one colour along a row merged into one rect. (dx, dy) shifts them, in cells
export function rects(cells: Cell[], dx = 0, dy = 0) {
  const rows = new Map<number, Cell[]>();
  for (const c of cells) (rows.get(c.y) ?? rows.set(c.y, []).get(c.y)!).push(c);
  let s = '';
  for (const [y, row] of rows) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length;) {
      let j = i + 1;
      while (j < row.length && row[j].x === row[j - 1].x + 1 && row[j].col === row[i].col) j++;
      s += `<rect x="${row[i].x + dx}" y="${y + dy}" width="${j - i}" height="1" fill="${row[i].col}"/>`;
      i = j;
    }
  }
  return s;
}
