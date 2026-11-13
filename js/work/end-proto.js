// PROTOTYPE (dev only, throwaway): three footers for the projects section behind a small switcher above it.
// loaded from main.js's import.meta.env.DEV block, so none of it reaches the live site. the shipped one is end.js.
//   bed     the garden's flowers on the last line (ships)
//   letter  a postcard from the garden: message and signature, stamp, the address lines
//   ink     an inverted panel that ends on the wordmark, its pixel flower stitching in
// pick with the switcher or ?footer=<id>; the pick is kept in localStorage.
import { EMAIL } from '../content.js';
import { endMarkup, wireEnd, flower, copyBtn, topLink, year, extLink, PAGES, ELSEWHERE } from './end.js';

const KEY = 'proto.footer';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const pages = () => PAGES.map(([l, h]) => `<a href="${h}">${l}</a>`).join('');
const wordmark = () => document.querySelector('.mark .wm')?.outerHTML.replace('class="wm"', 'class="wm end-wm-svg"') || '<span class="end-wm-txt">soumik</span>';

// the stamp: perforated edge, sky ground, a sunflower standing on a strip of soil, all in cells
function stamp() {
  const W = 20, H = 24, sky = '#bfe1ff', edge = '#9fcdf5';
  let d = '', e = '';
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const rim = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    if (rim && (x + y) % 2) continue;
    (x === 1 || y === 1 || x === W - 2 || y === H - 2 ? (e += `M${x} ${y}h1v1h-1z`) : (d += `M${x} ${y}h1v1h-1z`));
  }
  const fl = flower('sunflower', 1, 0, 7).replace('<svg ', '<svg x="4" y="2" ');
  return `<svg class="end-stamp-svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges"><path fill="${sky}" d="${d}"/><path fill="${edge}" d="${e}"/>
    <rect x="2" y="20" width="16" height="2" fill="#8a5a2b"/><rect x="2" y="19" width="16" height="1" fill="#45a84f"/>${fl}</svg>`;
}
const postmark = () => `<svg class="end-pm" viewBox="0 0 120 80" aria-hidden="true"><defs><path id="end-pm-c" d="M40 40m-27 0a27 27 0 1 1 54 0a27 27 0 1 1 -54 0"/></defs>
  <circle cx="40" cy="40" r="34" /><circle cx="40" cy="40" r="20" />
  <text><textPath href="#end-pm-c">soumik.design · ${year()} · soumik.design ·</textPath></text>
  <text x="40" y="43.5" text-anchor="middle" class="end-pm-in">garden</text>
  <path d="M78 28q7-5 14 0t14 0t14 0M78 40q7-5 14 0t14 0t14 0M78 52q7-5 14 0t14 0t14 0" /></svg>`;

const LETTER = () => `
      <footer class="wk-end end-letter" aria-labelledby="end-h">
        <div class="end-card" data-wk-r>
          <div class="end-msg">
            <h2 class="end-greet" id="end-h">greetings from the garden</h2>
            <p class="end-body">thanks for scrolling all the way down. if something here made you want to say hi, write to me. i read every email.</p>
            <div class="end-signed"><span class="end-sr">signed, soumik</span>${wordmark()}</div>
          </div>
          <div class="end-addr">
            <div class="end-post" aria-hidden="true">${postmark()}<div class="end-stamp">${stamp()}</div></div>
            <ul class="end-lines">
              <li><span class="end-k">to</span><a class="end-mail" href="mailto:${EMAIL}" data-end-addr>${EMAIL}</a>${copyBtn()}</li>
              ${ELSEWHERE.map((s, i) => `<li><span class="end-k">${i ? '' : 'or'}</span>${extLink(s)}</li>`).join('')}
            </ul>
            <span class="end-inked" aria-hidden="true">copied!</span>
          </div>
        </div>
        <div class="end-base">
          <p>© ${year()} soumik halder · flowers stitched in pixels</p>
          <nav class="end-pages" aria-label="Pages">${pages()}</nav>
          ${topLink()}
        </div>
      </footer>`;

const INK = () => `
      <footer class="wk-end end-ink" aria-labelledby="end-h">
        <div class="end-panel" data-wk-r>
          <div class="end-row">
            <div class="end-say">
              <h2 class="end-k" id="end-h">say hi</h2>
              <p class="end-lede">write to me about anything. <span>i read every email.</span></p>
              <div class="end-mailrow"><a class="end-mail" href="mailto:${EMAIL}" data-end-addr>${EMAIL}</a>${copyBtn()}</div>
            </div>
            <nav class="end-idx" aria-label="More">
              <div><p class="end-k">pages</p><ul>${PAGES.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
              <div><p class="end-k">elsewhere</p><ul>${ELSEWHERE.map((s) => `<li>${extLink(s)}</li>`).join('')}</ul></div>
            </nav>
          </div>
          <div class="end-wm" aria-hidden="true" data-end-grow>${wordmark()}</div>
          <div class="end-base">
            <p>© ${year()} soumik halder<span class="end-role">, design engineer</span></p>
            <p class="end-made">flowers stitched in pixels</p>
            ${topLink()}
          </div>
        </div>
      </footer>`;

const VARIANTS = { bed: endMarkup, letter: LETTER, ink: INK };
const HINTS = { bed: 'ships: flowers on the last line', letter: 'a postcard from the garden', ink: 'inverted panel, ends on the name' };

const CSS = `
/* the switcher: dev chrome, not the site's */
.end-proto { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; width: fit-content; margin: 72px auto -48px; padding: 4px; border-radius: 99px;
  background: #111; color: #fff; font: 12px/1 ui-monospace, "SF Mono", Menlo, monospace; box-shadow: 0 0 0 1px rgba(255,255,255,.1); }
.end-proto b { font-weight: 400; opacity: .55; padding: 0 10px 0 12px; }
.end-proto button { all: unset; cursor: pointer; min-height: 36px; padding: 0 12px; border-radius: 99px; opacity: .6; }
.end-proto button[aria-pressed="true"] { opacity: 1; background: rgba(255,255,255,.14); }
.end-proto button:focus-visible { outline: 2px solid #fff; outline-offset: -2px; }
.end-proto small { flex-basis: 100%; text-align: center; opacity: .5; font-size: 10.5px; padding: 4px 0 6px; }

/* letter: a postcard on the page. white card, hairline, message on the left, stamp and address lines on the right */
.end-letter .end-card { position: relative; display: grid; grid-template-columns: 1fr 1.12fr; border-radius: var(--wk-rad); background: var(--wk-paper);
  box-shadow: 0 0 0 1px var(--wk-line), 0 30px 60px -40px var(--wk-shadow); }
.end-letter .end-msg { display: flex; flex-direction: column; padding: clamp(28px, 4vw, 48px); border-right: 1px solid var(--wk-line); }
.end-letter .end-greet { margin: 0; font: 500 clamp(22px, 2.4vw, 28px)/1.1 var(--pixel, var(--wk-mono)); letter-spacing: .01em; max-width: 9em; }
.end-letter .end-body { margin-top: 20px; max-width: 30em; font: 400 15.5px/1.6 system-ui, -apple-system, "SF Pro Text", sans-serif; color: var(--wk-text); text-wrap: pretty; }
.end-letter .end-signed { margin-top: auto; padding-top: 32px; color: var(--wk-ink); }
.end-letter .end-signed .wm { display: block; width: 132px; height: auto; overflow: visible; }
.end-letter .end-addr { position: relative; display: flex; flex-direction: column; padding: clamp(24px, 3.4vw, 40px) clamp(24px, 3.4vw, 40px) clamp(20px, 3vw, 32px); }
.end-letter .end-post { position: relative; align-self: flex-end; display: flex; align-items: center; height: 104px; margin-bottom: clamp(32px, 4vw, 48px); }
.end-letter .end-stamp { position: relative; z-index: 0; }
.end-letter .end-stamp-svg { display: block; width: 80px; height: 96px; rotate: 3deg; }
.end-letter .end-pm { position: absolute; z-index: 1; right: 46px; top: 22px; width: 132px; height: 88px; rotate: -10deg; fill: none; stroke: var(--wk-ink2); stroke-width: 1.2; opacity: .55; }
.end-letter .end-pm text { fill: var(--wk-ink2); stroke: none; font: 500 7.2px/1 var(--wk-mono); letter-spacing: .08em; }
.end-letter .end-pm .end-pm-in { font: 500 8px/1 var(--pixel, var(--wk-mono)); }
.end-letter .end-lines li { display: flex; align-items: center; gap: 12px; min-height: 52px; border-bottom: 1px solid var(--wk-line2); }
.end-letter .end-lines .end-k { flex: none; width: 18px; }
.end-letter .end-lines a { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font: 400 15px/1 var(--wk-serif); }
.end-letter .end-lines .end-mail { flex: 1; min-width: 0; font-weight: 500; font-size: 16px; letter-spacing: -.01em; white-space: nowrap; }
.end-letter .end-lines .end-copy { min-height: 36px; }
@media (hover: hover) and (pointer: fine) { .end-letter .end-lines a:hover { color: var(--wk-ink2); } }
.end-letter .end-inked { position: absolute; right: 12%; bottom: 19%; padding: 6px 10px 4px; border: 2px solid #d9334a; border-radius: 6px; color: #d9334a;
  font: 600 18px/1 var(--pixel, var(--wk-mono)); rotate: -9deg; opacity: 0; pointer-events: none; mix-blend-mode: multiply; }
:root[data-theme="dark"] .end-letter .end-inked { mix-blend-mode: normal; color: #ff6b7a; border-color: #ff6b7a; }
.end-letter.is-stamped .end-inked { opacity: .9; }
.end-letter .end-base { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 24px; margin-top: 20px; font: 400 11.5px/1.3 var(--wk-mono); color: var(--wk-ink2); }
.end-letter .end-pages { display: flex; gap: 2px; }
.end-letter .end-pages a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px; transition: color .25s; }
@media (hover: hover) and (pointer: fine) { .end-letter .end-pages a:hover { color: var(--wk-ink); } }
@media (prefers-reduced-motion: no-preference) {
  .end-letter.is-stamped .end-inked { animation: end-thump .32s cubic-bezier(.2,.9,.3,1.2) both; }
  @keyframes end-thump { from { opacity: 0; scale: 1.7; } to { opacity: .9; scale: 1; } }
  .end-letter .end-stamp-svg { transition: rotate .5s var(--wk-spring), translate .5s var(--wk-spring); }
  @media (hover: hover) and (pointer: fine) { .end-letter .end-card:hover .end-stamp-svg { rotate: -2deg; translate: 0 -3px; } }
}
@media (max-width: 640px) {
  .end-letter .end-card { grid-template-columns: 1fr; }
  .end-letter .end-msg { position: relative; border-right: 0; border-bottom: 1px dashed var(--wk-line2); padding: 24px 20px 28px; }
  .end-letter .end-greet { padding-right: 84px; min-height: 2.2em; font-size: 22px; }
  .end-letter .end-addr { position: static; padding: 8px 20px 16px; }
  .end-letter .end-post { position: absolute; right: 16px; top: 16px; height: auto; margin: 0; }
  .end-letter .end-stamp-svg { width: 60px; height: 72px; }
  .end-letter .end-pm { right: 30px; top: 30px; width: 96px; height: 64px; }
  .end-letter .end-lines li:last-child { border-bottom: 0; }
  .end-letter .end-inked { right: 10%; bottom: 14%; font-size: 16px; }
  .end-letter .end-base { justify-content: center; text-align: center; }
  .end-letter .end-base > p { flex-basis: 100%; order: 3; padding-top: 4px; }
}

/* ink: an inverted panel that closes on the wordmark. day: ink panel, white type. night: a white panel on the black page */
.end-ink .end-panel { --pi: #fff; --pi2: rgba(255,255,255,.62); --pl: rgba(255,255,255,.16); --pw: rgba(255,255,255,.08);
  overflow: hidden; border-radius: var(--wk-rad); background: #1f1d1b; color: var(--pi); padding: clamp(28px, 4.4vw, 56px) clamp(24px, 4.4vw, 56px) clamp(16px, 2vw, 24px); }
:root[data-theme="dark"] .end-ink .end-panel { --pi: #000; --pi2: rgba(0,0,0,.6); --pl: rgba(0,0,0,.14); --pw: rgba(0,0,0,.06); background: #fff; }
.end-ink :focus-visible { outline-color: var(--pi); }
.end-ink .end-k, .end-ink .end-ar, .end-ink .end-top { color: var(--pi2); }
.end-ink .end-copy { color: var(--pi); box-shadow: inset 0 0 0 1px var(--pl); }
@media (hover: hover) and (pointer: fine) { .end-ink .end-copy:hover { background: var(--pw); box-shadow: inset 0 0 0 1px var(--pi2); } .end-ink .end-top:hover, .end-ink a:hover .end-ar { color: var(--pi); } }
.end-ink .end-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 40px clamp(40px, 6vw, 88px); align-items: start; }
.end-ink .end-lede { margin-top: 16px; font: 500 clamp(26px, 3vw, 36px)/1.12 var(--wk-serif); letter-spacing: -.03em; max-width: 13em; text-wrap: balance; }
.end-ink .end-lede span { color: var(--pi2); }
.end-ink .end-mailrow { display: flex; align-items: center; gap: 10px 14px; flex-wrap: wrap; margin-top: 24px; }
.end-ink .end-mail { font: 400 15px/1.3 var(--wk-serif); padding: 10px 0 6px; overflow-wrap: anywhere;
  background: linear-gradient(currentColor, currentColor) 0 100% / 100% 1px no-repeat; transition: background-size .5s var(--wk-ease); }
@media (hover: hover) and (pointer: fine) { .end-ink .end-mail:hover { background-size: 0 1px; background-position: 100% 100%; } }
.end-ink .end-idx { display: grid; grid-template-columns: repeat(2, minmax(96px, auto)); gap: 0 clamp(24px, 3.4vw, 48px); padding-top: 2px; }
.end-ink .end-idx .end-k { margin-bottom: 6px; }
.end-ink .end-idx a { display: flex; align-items: center; gap: 6px; min-height: 40px; font: 400 15px/1 var(--wk-serif); }
.end-ink .end-wm { margin: clamp(56px, 8vw, 104px) 0 0; color: var(--pi); }
.end-ink .end-wm .wm { display: block; width: 100%; height: auto; overflow: visible; }
.end-ink .end-wm .wm-l path { transform-box: fill-box; }
.end-ink .end-wm .wm-f rect { shape-rendering: crispEdges; }
.end-ink .end-wm-txt { font: 500 22vw/1 var(--wk-serif); }
.end-ink .end-base { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 4px 16px; margin-top: clamp(12px, 2vw, 20px); padding-top: 4px;
  border-top: 1px solid var(--pl); font: 400 11.5px/1.3 var(--wk-mono); color: var(--pi2); }
.end-ink .end-made { text-align: center; }
.end-ink .end-top { justify-self: end; }
@media (prefers-reduced-motion: no-preference) {
  .wk-armed .end-ink:not(.is-grown) .end-wm .wm-l path, .wk-armed .end-ink:not(.is-grown) .end-wm .wm-f rect { opacity: 0; }
  .end-ink.is-grown .end-wm .wm-l path { animation: end-ink-in .9s var(--wk-ease) both; animation-delay: calc(var(--i) * 70ms); }
  .end-ink.is-grown .end-wm .wm-f rect { animation: end-stitch .14s linear both; animation-delay: calc(.6s + var(--k) * 30ms); }
  @keyframes end-ink-in { from { opacity: 0; transform: translateY(30%); } to { opacity: 1; transform: none; } }
  @keyframes end-stitch { from { opacity: 0; } to { opacity: 1; } }
}
@media (max-width: 640px) {
  .end-ink .end-panel { padding: 28px 20px 12px; }
  .end-ink .end-row { grid-template-columns: 1fr; gap: 36px; }
  .end-ink .end-lede { font-size: 26px; }
  .end-ink .end-mailrow { flex-wrap: nowrap; justify-content: space-between; }
  .end-ink .end-idx { grid-template-columns: 1fr 1fr; }
  .end-ink .end-idx a { min-height: 44px; }
  .end-ink .end-wm { margin-top: 48px; }
  .end-ink .end-base { grid-template-columns: 1fr auto; }
  .end-ink .end-made, .end-ink .end-role { display: none; }
}
`;

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

let pick = new URLSearchParams(location.search).get('footer') || read() || 'bed';
if (!VARIANTS[pick]) pick = 'bed';
let unwire = () => {};
let stamped;

function render(footer) {
  // always swap, even for the shipped one, so this module owns the only wiring
  footer.outerHTML = VARIANTS[pick]();
  const next = document.querySelector('#projects .wk-end');
  next.querySelectorAll('[data-wk-r]').forEach((el) => el.classList.add('is-in'));
  unwire();
  const off = wireEnd(next, reduced);
  // letter: a rubber stamp thumps onto the card when the address is copied
  const onCopied = () => { next.classList.remove('is-stamped'); void next.offsetWidth; next.classList.add('is-stamped'); clearTimeout(stamped); stamped = setTimeout(() => next.classList.remove('is-stamped'), 2200); };
  next.addEventListener('end:copied', onCopied);
  unwire = () => { off(); next.removeEventListener('end:copied', onCopied); };
  return next;
}

function bar(footer) {
  const el = document.createElement('div');
  el.className = 'end-proto';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'footer variant');
  el.innerHTML = `<b>footer</b>${Object.keys(VARIANTS).map((k, i) => `<button type="button" data-v="${k}">${i + 1} ${k}</button>`).join('')}<small></small>`;
  const paint = () => {
    el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === pick)));
    el.querySelector('small').textContent = HINTS[pick];
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    pick = b.dataset.v;
    write(pick);
    try { const u = new URL(location.href); u.searchParams.set('footer', pick); history.replaceState(history.state, '', u); } catch {}
    render(document.querySelector('#projects .wk-end'));
    paint();
  });
  footer.before(el);
  paint();
}

function mount(footer) {
  if (!document.getElementById('end-proto-css')) document.head.insertAdjacentHTML('beforeend', `<style id="end-proto-css">${CSS}</style>`);
  const next = render(footer);
  bar(next);
}

// work.js mounts the section later (on scroll or idle); catch the footer when it lands, every time it does
const section = document.getElementById('projects');
if (section) {
  const seen = new WeakSet();
  const check = () => {
    const f = section.querySelector('.wk-end');
    if (f && !seen.has(f) && !section.querySelector('.end-proto')) { seen.add(f); mount(f); }
  };
  new MutationObserver(check).observe(section, { childList: true });
  check();
}
