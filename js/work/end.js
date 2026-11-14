// The page's closing: its own section under the projects, ruled off from them, with a bed of the garden's flowers on the ground.
// endMarkup() -> html, wireEnd(footer, reduced) -> cleanup. wireEnd injects the css (once) and owns the reveal,
// so nothing here leans on the projects' styles; it brings its own tokens, light and night.
// the shared parts (copy, back to the garden, credits) are generic so a dev-only prototype (end-proto.js) can swap in others.
import { EMAIL, SOCIALS, GITHUB } from '../content.js';
import { FLOWERS } from '../garden/flora.js';

const GREENS = { G: '#2f8f3e', g: '#1d6b2c', L: '#45a84f', l: '#86d06c' };
const out = '<span class="end-ar" aria-hidden="true">↗</span>';

export const PAGES = [['projects', '/projects/'], ['blog', '/blog/'], ['vault', '/vault/']];
export const ELSEWHERE = [
  ['linkedin', SOCIALS.find((s) => /linkedin/i.test(s.label))?.href],
  ['x', SOCIALS.find((s) => s.label === 'X')?.href],
  ['github', GITHUB],
].filter(([, href]) => href);

const svgCells = (cells, minX, vw, vh) =>
  `<svg viewBox="${minX} 0 ${vw} ${vh}" width="${vw}" height="${vh}" style="--w:${vw};--h:${vh}" shape-rendering="crispEdges">${Object.entries(cells).map(([fill, d]) => `<path fill="${fill}" d="${d.join('')}"/>`).join('')}</svg>`;

// one flower from the garden's sprite data, with a stem and a leaf, as crisp svg cells
export function flower(name, form = 0, pal = 0, stem = 6, leaf = 'l') {
  const fam = FLOWERS[name];
  const f = fam.forms[Math.min(form, fam.forms.length - 1)];
  const colours = { ...GREENS, ...f.pals[pal % f.pals.length] };
  const w = Math.max(...f.head.map((r) => r.length));
  const foot = f.foot ?? Math.floor(w / 2);
  const cells = {};
  const put = (x, y, c) => { if (colours[c]) (cells[colours[c]] ||= []).push(`M${x} ${y}h1v1h-1z`); };
  f.head.forEach((row, y) => [...row].forEach((c, x) => put(x, y, c)));
  const top = f.head.length;
  const mid = Math.floor(stem / 2);
  const side = leaf === 'l' ? -1 : 1;
  for (let i = 0; i < stem; i++) {
    put(foot, top + i, i % 3 === 2 ? 'g' : 'G');
    if (i === mid) { put(foot + side, top + i, 'L'); put(foot + side * 2, top + i - 1, 'l'); put(foot + side * 2, top + i, 'L'); }
  }
  const minX = Math.min(0, foot - 2), maxX = Math.max(w, foot + 3);
  return svgCells(cells, minX, maxX - minX, top + stem);
}

// a tuft of grass for between the flowers, drawn the same way
const TUFTS = [
  ['.l...', '.L..l', 'LG.L.', 'GgLG.'],
  ['...l.', 'l..L.', '.L.GL', '.GLgG'],
  ['..l', 'l.L', 'LGG'],
];
function tuft(n) {
  const rows = TUFTS[n % TUFTS.length];
  const cells = {};
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (GREENS[c]) (cells[GREENS[c]] ||= []).push(`M${x} ${y}h1v1h-1z`); }));
  return svgCells(cells, 0, rows[0].length, rows.length).replace('<svg ', '<svg class="end-tuft" ');
}

// shared pieces every footer uses
export const copyBtn = () => `<button type="button" class="end-copy" data-end-copy aria-label="copy email address">
  <span class="end-copy-a"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5"/><path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3v5.5A1.5 1.5 0 0 0 3.5 10h.3"/></svg><i>copy</i></span>
  <span class="end-copy-b" aria-hidden="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5"/></svg><i>copied</i></span>
</button><span class="end-sr" role="status" data-end-status></span>`;
export const topLink = (label = 'back to the garden') => `<a class="end-top" href="#top" data-end-top><span aria-hidden="true">↑</span> ${label}</a>`;
export const year = () => new Date().getFullYear();
export const extLink = ([label, href]) => `<a href="${href}" target="_blank" rel="noopener">${label} ${out}</a>`;

// the bed: [family, form, palette, stem, tier, tuft]. neighbours differ in colour and height, the tall ones stay off the edges.
// tier 0 shows everywhere, 1 from tablets, 2 from laptops, 3 on wide screens, spread so each width stays evenly planted.
// tuft: a grass tuft beside the flower (-1 left, 1 right), from tablets up
const BED = [
  ['tulip', 0, 0, 7, 0, 1], ['forget', 1, 1, 5, 1, 0], ['daisy', 0, 0, 11, 2, -1], ['poppy', 1, 0, 9, 0, 0],
  ['lavender', 2, 0, 5, 3, 1], ['sunflower', 0, 0, 15, 0, 0], ['bluebell', 0, 1, 6, 1, -1], ['cosmos', 0, 1, 8, 2, 0],
  ['rose', 0, 0, 10, 0, 1], ['forget', 2, 2, 4, 1, 0], ['iris', 0, 0, 7, 2, -1], ['allium', 0, 1, 13, 0, 0],
  ['tulip', 0, 2, 6, 3, 1], ['daisy', 1, 0, 10, 0, 0], ['pansy', 1, 0, 6, 1, -1], ['lily', 0, 0, 12, 2, 0],
  ['daffodil', 0, 0, 8, 0, 1], ['lavender', 3, 1, 4, 1, 0], ['sunflower', 1, 0, 11, 2, -1], ['poppy', 0, 1, 7, 0, 0],
  ['forget', 2, 0, 4, 3, 1], ['blossom', 1, 2, 10, 0, 0], ['tulip', 0, 3, 8, 1, -1], ['cosmos', 1, 0, 7, 2, 0],
];

// the bed is planted fresh on every visit: a random flower in every slot, never the same family twice in a row, the
// tall ones kept off the edges. the slots' tiers (how wide a screen shows them) and grass tufts come from BED
const pick = (n) => Math.floor(Math.random() * n);
const FAMS = Object.keys(FLOWERS);
function plantBed() {
  let prev = '';
  return BED.map(([, , , , t, side], i) => {
    let n; do n = FAMS[pick(FAMS.length)]; while (n === prev && FAMS.length > 1);
    prev = n;
    const forms = FLOWERS[n].forms, f = pick(forms.length), p = pick(forms[f].pals.length);
    const edge = i < 2 || i > BED.length - 3;
    const s = edge ? 4 + pick(5) : 4 + pick(11);
    return [n, f, p, s, t, side];
  });
}
const slot = ([n, f, p, s, t, side], i) => {
  const fl = `<span class="end-fl"><span class="end-sw">${flower(n, f, p, s, i % 2 ? 'r' : 'l')}</span></span>`;
  const g = side ? tuft(i) : '';
  return `<span class="end-sl t${t}" style="--i:${i}" data-fl="${n},${f},${p},${s},${i % 2 ? 'r' : 'l'}">${side < 0 ? g + fl : fl + g}</span>`;
};
const bed = () => plantBed().map(slot).join('');

export function endMarkup() {
  return `
      <footer class="wk-end end-bed" aria-labelledby="end-h">
        <div class="end-main">
          <p class="end-kick" data-end-r>the end of the garden</p>
          <h2 class="end-h" id="end-h" data-end-r style="--d:.06s">something growing? <em>write to me.</em></h2>
          <div class="end-mailrow" data-end-r style="--d:.14s">
            <button type="button" class="end-seed" data-end-copy aria-label="copy ${EMAIL}">
              <span class="end-seed-t" data-end-addr>${EMAIL}</span>
              <span class="end-seed-i" aria-hidden="true"><svg class="end-i-a" viewBox="0 0 16 16"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5"/><path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3v5.5A1.5 1.5 0 0 0 3.5 10h.3"/></svg><svg class="end-i-b" viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5"/></svg></span>
            </button>
            <span class="end-sr" role="status" data-end-status></span>
          </div>
        </div>
        <div class="end-beds" aria-hidden="true" data-end-grow>${bed()}</div>
        <div class="end-base">
          <p>© ${year()} soumik halder</p>
          <p class="end-made">flowers stitched in pixels</p>
          ${topLink()}
        </div>
      </footer>`;
}

// css every footer shares: its own tokens, so it reads the same wherever it's mounted
export const END_BASE_CSS = `
/* closing: the page's footer. the old site footer under it steps aside once this is here */
body:has(.wk-end) > .foot { display: none; }
.wk-root:has(.wk-end) { padding-bottom: 0; }
.wk-end { --e-paper: #fff; --e-ink: #1f1d1b; --e-ink2: rgba(31,29,27,.6); --e-text: rgba(31,29,27,.72); --e-line: rgba(31,29,27,.12);
  --e-line2: rgba(31,29,27,.22); --e-wash: rgba(31,29,27,.045);
  --e-sans: "Instrument Sans", -apple-system, system-ui, sans-serif; --e-mono: ui-monospace, "SF Mono", Menlo, monospace;
  --e-ease: cubic-bezier(.22,1,.36,1); --e-spring: cubic-bezier(.3,1.4,.5,1);
  position: relative; margin-top: clamp(120px, 15vw, 192px);
  /* room under the credits for the fixed about-me dock, so at the very bottom it floats on paper, not on the text */
  padding-bottom: calc(var(--dock-f, max(20px, env(safe-area-inset-bottom))) + 64px);
  color: var(--e-ink); -webkit-font-smoothing: antialiased; }
:root[data-theme="dark"] .wk-end { --e-paper: #000; --e-ink: #f2f2f0; --e-ink2: rgba(242,242,240,.56); --e-text: rgba(242,242,240,.72);
  --e-line: rgba(255,255,255,.13); --e-line2: rgba(255,255,255,.26); --e-wash: rgba(255,255,255,.07); }
.wk-end *, .wk-end *::before, .wk-end *::after { box-sizing: border-box; }
.wk-end p { margin: 0; }
.wk-end ul { list-style: none; margin: 0; padding: 0; }
.wk-end a { color: inherit; text-decoration: none; -webkit-tap-highlight-color: transparent; }
.wk-end :focus-visible { outline: 2px solid var(--e-ink); outline-offset: 4px; border-radius: 6px; }
.wk-end ::selection { background: var(--e-ink); color: var(--e-paper); }
.end-k { font: 400 11px/1 var(--e-mono); letter-spacing: .04em; color: var(--e-ink2); }
.end-ar { display: inline-block; font-size: .8em; color: var(--e-ink2); transition: transform .4s var(--e-spring), color .25s; }
.end-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* copy: the label swaps for a tick and the pill fills in; screen readers hear it from the status */
.end-copy { position: relative; display: inline-grid; flex: none; min-height: 44px; padding: 0 18px 0 16px; border: 0; border-radius: 99px; cursor: pointer;
  font: 400 12px/1 var(--e-mono); letter-spacing: .02em; color: var(--e-ink); background: transparent; box-shadow: inset 0 0 0 1px var(--e-line2);
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transition: background-color .3s var(--e-ease), color .3s var(--e-ease), box-shadow .3s var(--e-ease), transform .16s var(--e-ease); }
.end-copy > span { grid-area: 1 / 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .2s, transform .4s var(--e-ease); }
.end-copy i { font-style: normal; }
.end-copy svg { width: 14px; height: 14px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.end-copy-b { opacity: 0; transform: translateY(7px); }
.end-copy[data-copied] { background: var(--e-ink); color: var(--e-paper); box-shadow: inset 0 0 0 1px var(--e-ink); }
.end-copy[data-copied] .end-copy-a { opacity: 0; transform: translateY(-7px); }
.end-copy[data-copied] .end-copy-b { opacity: 1; transform: none; }
.end-copy:active { transform: scale(.95); }
.wk-end .end-copy:focus-visible { border-radius: 99px; outline-offset: 3px; }
@media (hover: hover) and (pointer: fine) { .end-copy:not([data-copied]):hover { background: var(--e-wash); box-shadow: inset 0 0 0 1px var(--e-ink2); } }
/* phones: just the icon, so it fits beside the address */
@media (max-width: 640px) { .end-copy { width: 48px; min-height: 48px; padding: 0; } .end-copy i { display: none; } .end-copy svg { width: 16px; height: 16px; } }

.end-top { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font: 400 11.5px/1 var(--e-mono); color: var(--e-ink2); transition: color .25s; }
.end-top span { display: inline-block; transition: transform .5s var(--e-spring); }
@media (hover: hover) and (pointer: fine) {
  .end-top:hover { color: var(--e-ink); } .end-top:hover span { transform: translateY(-3px); }
  .wk-end a:hover .end-ar { color: var(--e-ink); transform: translate(2px, -2px); }
}
`;

// the bed's own: one line and the address centred over a bed that runs the full width. copying the address stitches
// one more flower in, and a tap on a flower turns it into the next of its kind
const BED_CSS = `
.end-bed { padding-top: clamp(72px, 9vw, 120px); }
.end-bed::before { content: ""; position: absolute; top: 0; left: calc(50% - 50vw); width: 100vw; height: 1px; background: var(--e-line); }
.end-bed .end-main { display: grid; justify-items: center; text-align: center; }
.end-kick { font: 500 14px/1 "Pixelify Sans", var(--e-mono); letter-spacing: .01em; color: var(--e-ink2); }
.end-bed .end-h { margin: 18px 0 0; max-width: 14ch; font: 500 clamp(44px, 7.2vw, 96px)/.98 var(--e-sans); letter-spacing: -.045em; text-wrap: balance; }
.end-bed .end-h em { font: italic 400 1.1em/1 "Instrument Serif", Georgia, serif; letter-spacing: -.02em; }
.end-bed .end-mailrow { display: grid; justify-items: center; gap: 14px; margin-top: clamp(32px, 4vw, 48px); }

/* the address is the button: tap it and it copies. the icon swaps for a tick and the pill fills in */
.end-seed { display: inline-flex; align-items: center; gap: 14px; max-width: 100%; min-height: 64px; padding: 0 10px 0 28px; border: 0; border-radius: 99px; cursor: pointer;
  font: 500 clamp(17px, 2.2vw, 26px)/1 var(--e-sans); letter-spacing: -.025em; color: var(--e-ink); background: var(--e-paper);
  box-shadow: inset 0 0 0 1px var(--e-line2), 0 18px 40px -26px rgba(31,29,27,.45); -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transition: background-color .3s var(--e-ease), color .3s var(--e-ease), box-shadow .3s var(--e-ease), transform .16s var(--e-ease); }
.end-seed-t { min-width: 0; overflow-wrap: anywhere; }
.end-seed-i { position: relative; flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: #ffd84d; color: #1f1d1b; }
.end-seed-i svg { grid-area: 1 / 1; width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; transition: opacity .2s, transform .35s var(--e-spring); }
.end-seed .end-i-b { opacity: 0; transform: scale(.6); }
.end-seed[data-copied] { background: var(--e-ink); color: var(--e-paper); box-shadow: inset 0 0 0 1px var(--e-ink); }
.end-seed[data-copied] .end-i-a { opacity: 0; transform: scale(.6); }
.end-seed[data-copied] .end-i-b { opacity: 1; transform: none; }
.end-seed:active { transform: scale(.97); }
.wk-end .end-seed:focus-visible { border-radius: 99px; outline-offset: 4px; }
@media (hover: hover) and (pointer: fine) { .end-seed:not([data-copied]):hover { box-shadow: inset 0 0 0 1px var(--e-ink2), 0 22px 44px -24px rgba(31,29,27,.5); } }
.end-u { background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat; transition: background-size .5s var(--e-ease); padding-bottom: .08em; }
.wk-end a:focus-visible .end-u { background-size: 100% 1px; }
@media (hover: hover) and (pointer: fine) { .wk-end a:hover .end-u { background-size: 100% 1px; } }

/* the bed: flowers, grass and the markers on one ground line across the whole page; how many flowers depends on the width */
.end-bed .end-beds { --c: 3px; position: relative; display: flex; justify-content: space-evenly; align-items: flex-end;
  margin: clamp(64px, 7vw, 96px) calc(50% - 50vw) 0; padding: 16px max(8px, env(safe-area-inset-right)) 0 max(8px, env(safe-area-inset-left));
  border-bottom: 1px solid var(--e-line2); }
.end-sl { display: flex; align-items: flex-end; gap: var(--c); }
.end-sl .end-fl { cursor: pointer; }
.end-sw.is-new svg { animation: end-grow .7s steps(10, end) both; }
.end-sl.t1, .end-sl.t2, .end-sl.t3, .end-bed .end-tuft { display: none; }
.end-fl, .end-sw { display: block; transform-origin: 50% 100%; }
.end-beds svg { display: block; width: calc(var(--w) * var(--c)); height: calc(var(--h) * var(--c)); overflow: visible; }
@media (min-width: 641px) { .end-sl.t1 { display: flex; } .end-bed .end-tuft { display: block; } }
@media (min-width: 1024px) { .end-sl.t2 { display: flex; } .end-bed .end-beds { --c: 4px; } }
@media (min-width: 1360px) { .end-sl.t3 { display: flex; } }

.end-bed .end-base { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px 16px; padding-top: 6px;
  font: 400 11.5px/1.3 var(--e-mono); color: var(--e-ink2); }
.end-bed .end-made { text-align: center; }
.end-bed .end-top { justify-self: end; }

@media (prefers-reduced-motion: no-preference) {
  .end-armed [data-end-r] { opacity: 0; transform: translateY(20px); transition: opacity .8s var(--e-ease) var(--d, 0s), transform 1s var(--e-ease) var(--d, 0s); }
  .end-armed.is-in [data-end-r] { opacity: 1; transform: none; }

  /* the flowers stitch in from the soil up, row by row, once the bed is on screen */
  .end-bed.end-armed:not(.is-grown) .end-beds svg { clip-path: inset(100% 0 0 0); }
  .end-bed.is-grown .end-beds svg { animation: end-grow .9s steps(12, end) both; animation-delay: calc(var(--i) * 45ms); }
  .end-bed.is-grown .end-beds .end-tuft { animation-duration: .5s; animation-timing-function: steps(4, end); animation-delay: calc(var(--i) * 45ms + .3s); }
  @keyframes end-grow { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0); } }

  .end-bed.is-grown .end-fl { animation: end-breeze 9s steps(2, end) infinite; animation-delay: calc(1.6s + var(--i) * 60ms); animation-play-state: paused; }
  .end-bed.is-grown.is-live .end-fl { animation-play-state: running; }
  @keyframes end-breeze { 0%, 13%, 100% { rotate: 0deg; } 3% { rotate: -2.5deg; } 6% { rotate: 1.5deg; } 9% { rotate: -.75deg; } }
  .end-sw.is-sway { animation: end-sway .9s steps(6, end); }
  @keyframes end-sway { 25% { rotate: -6deg; } 60% { rotate: 4deg; } 85% { rotate: -1.5deg; } }
}

/* phones */
@media (max-width: 640px) {
  .wk-end { margin-top: 112px; }
  .end-bed { padding-top: 56px; }
  .end-bed .end-h { font-size: clamp(40px, 12vw, 56px); }
  .end-seed { min-height: 56px; padding-left: 20px; gap: 10px; font-size: clamp(15px, 4.4vw, 18px); }
  .end-bed .end-base { grid-template-columns: 1fr auto; padding-top: 4px; }
  .end-bed .end-made { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .wk-end *, .wk-end *::before, .wk-end *::after { animation: none !important; transition-duration: .01s !important; }
}
`;

export const END_CSS = END_BASE_CSS + BED_CSS;

// copying plants one more flower somewhere in the bed (at most six), stitched in like the rest
const GIFTS = [['sunflower', 0, 0, 12], ['tulip', 0, 1, 8], ['rose', 0, 1, 9], ['daisy', 1, 0, 10], ['poppy', 0, 0, 8], ['cosmos', 1, 1, 9]];
let gifts = 0;
function plantOne(footer) {
  const beds = footer.querySelector('.end-beds');
  if (!beds || gifts >= GIFTS.length) return;
  const [n, f, p, st] = GIFTS[gifts++];
  const shown = [...beds.children].filter((c) => c.offsetParent !== null);
  const at = shown[1 + Math.floor(Math.random() * Math.max(1, shown.length - 2))];
  at?.insertAdjacentHTML('beforebegin', `<span class="end-sl t0 is-gift" style="--i:0" data-fl="${n},${f},${p},${st},l"><span class="end-fl"><span class="end-sw">${flower(n, f, p, st)}</span></span></span>`);
}

// css once, then copy the address, back to the garden, reveal on sight and grow the bed. works on any footer with the data hooks
export function wireEnd(footer, reduced) {
  if (!footer) return () => {};
  if (!document.getElementById('end-css')) document.head.insertAdjacentHTML('beforeend', `<style id="end-css">${END_CSS}</style>`);
  const offs = [];
  const on = (el, ev, fn) => { if (!el) return; el.addEventListener(ev, fn); offs.push(() => el.removeEventListener(ev, fn)); };
  let timer;
  const btn = footer.querySelector('[data-end-copy]');
  const status = footer.querySelector('[data-end-status]');
  on(btn, 'click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(EMAIL); ok = true; } catch {}
    // no clipboard (an old browser, or no permission): select the address so a long-press or cmd+c takes it
    if (!ok) {
      const addr = footer.querySelector('[data-end-addr]');
      if (addr) { const r = document.createRange(); r.selectNodeContents(addr); getSelection().removeAllRanges(); getSelection().addRange(r); }
      if (status) status.textContent = 'couldn’t copy, the address is selected';
      return;
    }
    btn.dataset.copied = '';
    if (status) status.textContent = 'email address copied';
    footer.dispatchEvent(new CustomEvent('end:copied'));
    plantOne(footer);
    clearTimeout(timer);
    timer = setTimeout(() => { delete btn.dataset.copied; if (status) status.textContent = ''; }, 2000);
  });
  footer.querySelectorAll('[data-end-top]').forEach((a) => on(a, 'click', (e) => {
    const target = document.getElementById('top');
    e.preventDefault();
    scrollTo({ top: target ? target.getBoundingClientRect().top + scrollY : 0, behavior: reduced.matches ? 'auto' : 'smooth' });
  }));

  const ios = [];
  const watch = (el, cb, opts) => { const io = new IntersectionObserver((es) => cb(es[es.length - 1].isIntersecting, io), opts); io.observe(el); ios.push(io); };
  const grow = footer.querySelector('[data-end-grow]') || footer;
  if (!('IntersectionObserver' in window) || reduced.matches) footer.classList.add('is-in', 'is-grown');
  else {
    footer.classList.add('end-armed');
    watch(footer, (on, io) => { if (on) { footer.classList.add('is-in'); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    watch(grow, (on) => { if (on) footer.classList.add('is-grown'); footer.classList.toggle('is-live', on); }, { threshold: 0.35 });
    // a tap on a flower turns it into the next of its kind (the next family on the last form), stitched in again
    on(grow, 'click', (e) => {
      const sl = e.target.closest?.('.end-sl'), sw = sl?.querySelector('.end-sw');
      if (!sl || !sw) return;
      let [n, f, p, st, side] = sl.dataset.fl.split(',');
      f = +f + 1;
      if (f >= FLOWERS[n].forms.length) { n = FAMS[(FAMS.indexOf(n) + 1) % FAMS.length]; f = 0; }
      p = pick(FLOWERS[n].forms[f].pals.length);
      sl.dataset.fl = [n, f, p, st, side].join(',');
      sw.innerHTML = flower(n, f, p, +st, side);
      sw.classList.remove('is-new'); void sw.offsetWidth; sw.classList.add('is-new');
    });
    // a flower sways when a pointer or a finger comes onto it; one sway at a time each
    on(grow, 'pointerover', (e) => {
      const sw = e.target.closest?.('.end-sw');
      if (!sw || sw.classList.contains('is-sway') || !footer.classList.contains('is-grown')) return;
      sw.classList.add('is-sway');
      sw.addEventListener('animationend', () => sw.classList.remove('is-sway'), { once: true });
    });
  }
  return () => { clearTimeout(timer); ios.forEach((io) => io.disconnect()); offs.forEach((f) => f()); };
}
