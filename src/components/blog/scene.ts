// the stills behind each header: what a post's header looks like before (or without) its script. built from the
// garden's sprites, so the still and the live header are made of the same stitches
import { grow, rects, mulberry, KINDS, type Plant } from './plant';

export type HeaderKind = 'garden' | 'xray' | 'scale';

// a seed from a post's slug, so each post gets its own bed and keeps it
export const seedOf = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

// the garden still: a loose sampler of plants across a wide band, the middle third kept the fullest so a phone (which
// sees only the middle) still gets a bed. sizes in cells
export const BED = { w: 206, h: 60 };
// the list's small still gets five plants in the middle, so no flower is cut by the frame at any width
export const MINI_XS = [66, 82, 98, 114, 130];
export function gardenStill(seed: number, xs = [14, 32, 52, 70, 88, 104, 120, 138, 156, 174, 192]) {
  const rnd = mulberry(seed);
  const deck = [...KINDS].sort(() => rnd() - .5);
  let s = '';
  xs.forEach((x0, i) => {
    const kind = deck[i % deck.length];
    const p = grow(kind, { seed: Math.floor(rnd() * 1e9), pal: Math.floor(rnd() * 4), form: Math.floor(rnd() * 3) });
    const [, , , bottom] = p.box;
    // heads ride at different heights, but every stem stays inside the band
    const y = Math.min(BED.h - 2 - bottom, 12 + Math.floor(rnd() * 18) + (i % 2) * 6);
    // one group a plant, so the list's still can sway them one by one
    s += `<g style="--i:${i}">${rects(p.cells, x0 + Math.round((rnd() - .5) * 6), y)}</g>`;
  });
  return s;
}

// the x-ray: one rose, stitch by stitch. the same plant every time
export const XRAY_SEED = 7;
export const xrayPlant = (): Plant => grow('rose', { seed: XRAY_SEED, form: 0, pal: 0, green: 0, len: 8 });
