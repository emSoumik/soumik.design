// PROTOTYPE: everything the lab shows, in one place. phone screens only: a laptop frame breaks the run of phones.
// every claim here comes from the store itself, its code or its docs; nothing is made up to fill a slot
const A = '/assets/work/whyclub/';

export interface Tile {
  kind: 'rec' | 'shot' | 'safari' | 'quote' | 'stat';
  src?: string; alt?: string; title: string; desc: string; big?: string;
}

export const tiles = {
  dock: { kind: 'rec', src: A + 'p-nav', alt: 'The dock on the home page growing into the Shop panel.', title: 'The dock', desc: 'A bar of five that grows into a panel, and shrinks to a pill as you scroll.' },
  quick: { kind: 'rec', src: A + 'p-quickadd', alt: 'Quick add opening over the shop, M picked, then Add to bag.', title: 'Quick add', desc: 'Photos, price and size, without leaving the shop.' },
  sheet: { kind: 'rec', src: A + 'p-sheets', alt: 'A product page where the details sheet rises over the tee.', title: 'Details over the photo', desc: 'The sheet comes up over the tee, so it stays on screen while you read.' },
  pass: { kind: 'rec', src: A + 'p-pass', alt: 'The drop pass printing in, then moving through its stages.', title: 'The drop pass', desc: 'It prints in when you pay, then changes as the parcel moves.' },
  drops: { kind: 'rec', src: A + 'p-hero', alt: 'The home page, swiping from one drop to the next.', title: 'One drop per screen', desc: 'A campaign photo for each drop. Swipe for the next.' },
  loading: { kind: 'rec', src: A + 'p-loading', alt: 'The shop holding grey placeholders while photos load, then filling in.', title: 'It holds its shape', desc: 'Placeholders keep the grid still while the photos load.' },
  doors: { kind: 'rec', src: A + 'p-categories', alt: 'Two category photos, Explore Women and Explore Men.', title: 'Two doors in', desc: 'Women and men, one photo each.' },
  bag: { kind: 'shot', src: A + 'm-cart', alt: 'The bag with one tee, a free socks offer and the order summary.', title: 'The bag, kept short', desc: 'Each piece on one line, the total under it, then checkout.' },
  lost: { kind: 'shot', src: A + 'p-404', alt: 'The 404 page: a prism splitting light across the number.', title: 'A 404 that splits the light', desc: 'A prism, drawn live in WebGL.' },
  safari: { kind: 'safari', alt: 'The home page in Safari, before and after: the second runs under the glass toolbar.', title: 'At home in iOS 26 Safari', desc: 'Before and after: the store runs under Safari’s glass bars.' },
  quote: { kind: 'quote', title: 'The idea', desc: 'A loud brand on a quiet store.' },
  commits: { kind: 'stat', big: '251', title: 'Commits', desc: 'From the first page in March 2026 to the store today.' },
  tests: { kind: 'stat', big: '201', title: 'Test files', desc: 'Unit tests in Vitest, whole flows in Playwright.' },
  sounds: { kind: 'stat', big: '24', title: 'Sound cues', desc: 'Each one optional, each with something to see as well.' },
} satisfies Record<string, Tile>;
export type TileKey = keyof typeof tiles;

// what the finger in the scripted phone is doing, beat by beat
export const beats = [
  { id: 'home', n: '01', t: 'Home', d: 'One drop per screen. Tap Shop in the dock.' },
  { id: 'shop', n: '02', t: 'Shop', d: 'Two to a row. The + on each card is quick add.' },
  { id: 'sheet', n: '03', t: 'Quick add', d: 'Photos, price and size, without leaving the shop.' },
  { id: 'added', n: '04', t: 'Added', d: 'Add to bag, and the bag in the dock counts it.' },
  { id: 'cart', n: '05', t: 'Bag', d: 'Each piece on one line, the total under it.' },
];

// the storyboard: the whole journey as six frames
export const frames = [
  { n: '01', t: 'Drop', d: 'A campaign photo per drop, its name across it.', src: A + 'm-01', alt: 'Home: the Please, I’m a Star drop, full screen.' },
  { n: '02', t: 'Shop', d: 'Two to a row. The + on each card is quick add.', src: A + 'm-02', alt: 'The shop: a two-column grid of tees with prices.' },
  { n: '03', t: 'Quick add', d: 'Photos, price and size, without leaving the shop.', src: A + 'm-04', alt: 'Quick add open over the shop with M picked.' },
  { n: '04', t: 'Product', d: 'Pick a size, or open the size guide.', src: A + 'm-03', alt: 'The product page for the Please, I’m a Star tee.' },
  { n: '05', t: 'Bag', d: 'A free pair of socks, one tap to add.', src: A + 'm-cart', alt: 'The bag with one tee and the order summary.' },
  { n: '06', t: 'The pass', d: 'It prints in when you pay, then follows the parcel.', src: A + 'pass/confirmed-m', alt: 'The drop pass: You’re in, order WC-1182, confirmed.' },
];

// the notes on the annotated phone: where each one points, as percentages of the screen
export const notes = [
  { id: 'home', x: 33.5, y: 94, t: 'The dock', d: 'Five tabs, where your thumb already is.' },
  { id: 'shop', x: 42.3, y: 38.1, t: 'Quick add', d: 'The + on every card opens it.' },
  { id: 'sheet', x: 80, y: 46, t: 'A sheet over the shop', d: 'Photos, price and size. The grid stays behind it.' },
  { id: 'added', x: 52.3, y: 92.9, t: 'The bag counts it', d: 'You never left the shop.' },
  { id: 'cart', x: 64, y: 30, t: 'The bag, kept short', d: 'One line per piece, the total under it.' },
];

export const A_ = A;
