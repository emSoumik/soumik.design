// Mochi: one small companion that rides along the whole page, bottom-right.
// Resting, she's a round face. When she has something to say, the face grows into a pill
// (a clip-path morph, the way a Dynamic Island opens), thinks for a beat, types one line,
// then folds back into the face. Each section gets at most one line.
//
//   const mochi = createMochi()
//   mochi.say(text, { action, hold })   // action(): what tapping the open pill does
//   mochi.watch(el, text | () => text, { action, threshold })   // say it once when el scrolls into view
//   mochi.hush()                         // fold up now (e.g. when another panel opens)
import { wipCat } from './cats.js';
import { feel } from './feel.js';

const OPEN = 'cubic-bezier(.32,.72,0,1)';
const OUT = 'cubic-bezier(.23,1,.32,1)';
const FACE = 48;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const delay = (ch, next) => /[.?!]/.test(ch) && next === ' ' ? 240 : /[,;:]/.test(ch) ? 120 : 18 + Math.random() * 8;
const face = () => wipCat().replace('viewBox="0 0 180 160"', 'viewBox="32 24 116 116"');

const CSS = `
.mo { position: fixed; z-index: 60; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom));
  display: flex; justify-content: flex-end; pointer-events: none;
  /* the shadow lives on the wrapper so it follows the clipped shape as the pill morphs */
  filter: drop-shadow(0 0 .6px rgba(20,20,30,.28)) drop-shadow(0 8px 18px rgba(20,20,30,.13)); }
.mo-pill { all: unset; box-sizing: border-box; pointer-events: auto; cursor: pointer; position: relative; display: flex; align-items: center; gap: 10px;
  max-width: min(340px, calc(100vw - 32px)); min-height: ${FACE}px; padding: 4px 4px 4px 16px; border-radius: ${FACE / 2}px;
  background: #fff; color: #1d1c1b;
  -webkit-tap-highlight-color: transparent; will-change: clip-path; }
.mo.rest .mo-pill { padding-left: 4px; }
.mo-pill:focus-visible { outline: 1.5px solid #1d1c1b; outline-offset: 3px; }
.mo-text { font: 400 13.5px/1.35 -apple-system, system-ui, sans-serif; text-wrap: pretty; padding: 6px 0; }
.mo-text .b { visibility: hidden; }
.mo-dots { display: none; gap: 4px; padding: 0 4px; }
.mo-dots i { width: 5px; height: 5px; border-radius: 50%; background: rgba(29,28,27,.4); animation: mo-dot 1s ease-in-out infinite; }
.mo-dots i:nth-child(2) { animation-delay: .15s; } .mo-dots i:nth-child(3) { animation-delay: .3s; }
.mo.thinking .mo-dots { display: flex; } .mo.thinking .mo-text { display: none; }
@keyframes mo-dot { 0%, 100% { opacity: .35; transform: none; } 50% { opacity: 1; transform: translateY(-2px); } }
.mo-face { flex: none; width: ${FACE - 8}px; height: ${FACE - 8}px; border-radius: 50%; overflow: hidden; background: #fff;
  box-shadow: 0 0 0 1px rgba(20,20,20,.06); }
.mo-face svg { display: block; width: 100%; height: 100%; }
/* idle life: a slow breath, like something that's awake */
.mo-face .cat { transform-origin: 50% 80%; animation: mo-breathe 3.6s ease-in-out infinite; }
.mo.typing .mo-face .cat { animation: mo-nod .5s ease-in-out infinite alternate; }
@keyframes mo-breathe { 50% { transform: translateY(-1.2px) scale(1.015); } }
@keyframes mo-nod { to { transform: translateY(.8px) rotate(-1.5deg); } }
.mo-pill:active { transform: scale(.97); transition: transform .16s ${OUT}; }
.mo-hit { position: absolute; inset: -6px; }
.mo-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (min-width: 641px) { .mo { right: max(24px, env(safe-area-inset-right)); bottom: 24px; } .mo-pill { max-width: 460px; } .mo-text { font-size: 14px; } }
@media (prefers-reduced-motion: reduce) { .mo-face .cat, .mo-dots i { animation: none !important; } }
`;

export function createMochi() {
  if (!document.getElementById('mo-style')) document.head.insertAdjacentHTML('beforeend', `<style id="mo-style">${CSS}</style>`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'mo';
  el.innerHTML = `<button class="mo-pill" type="button" aria-label="mochi"><span class="mo-hit"></span>
      <span class="mo-text" aria-hidden="true"><span class="a"></span><span class="b"></span></span>
      <span class="mo-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="mo-face">${face()}</span></button><span class="mo-live" role="status"></span>`;
  document.body.appendChild(el);
  const pill = el.querySelector('.mo-pill'), text = el.querySelector('.mo-text'), live = el.querySelector('.mo-live');
  const [a, b] = text.querySelectorAll('span');
  let open = false, run = 0, cur = null, last = null, foldT = 0, anim = null, shown = false;

  // the clip that leaves only the face showing, measured from the pill's current size
  const shut = () => `inset(0px 0px 0px ${pill.offsetWidth - FACE}px round ${FACE / 2}px)`;
  const full = `inset(0px 0px 0px 0px round ${FACE / 2}px)`;
  const resting = () => { anim?.cancel(); anim = null; text.style.display = 'none'; el.classList.remove('thinking'); el.classList.add('rest'); pill.style.clipPath = ''; };
  resting();
  pill.style.opacity = 0;

  // she arrives once, softly
  function arrive() {
    if (shown) return; shown = true;
    const k = pill.animate([{ opacity: 0, transform: 'translateY(8px) scale(.92)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }],
      { duration: reduced ? 1 : 520, easing: OUT, fill: 'forwards' });
    k.finished.then(() => { pill.style.opacity = ''; k.cancel(); }).catch(() => {});
  }

  async function morph(to) {
    anim?.cancel();
    if (reduced) { pill.style.clipPath = to === 'open' ? '' : shut(); return; }
    const from = to === 'open' ? shut() : full, dest = to === 'open' ? full : shut();
    anim = pill.animate([{ clipPath: from }, { clipPath: dest }], { duration: to === 'open' ? 560 : 340, easing: to === 'open' ? OPEN : OUT, fill: 'forwards' });
    try { await anim.finished; } catch {}
  }

  async function say(line, o = {}) {
    arrive();
    if (open) await fold();
    const id = ++run;
    clearTimeout(foldT);
    cur = { line, ...o }; last = cur;
    a.textContent = ''; b.textContent = line;
    // think first: the face grows just wide enough for three dots
    text.style.display = '';
    el.classList.remove('rest');
    el.classList.add('thinking');
    pill.style.clipPath = shut();
    open = true;
    feel.pop();
    await morph('open');
    if (id !== run) return;
    await sleep(reduced ? 0 : 480);
    if (id !== run) return;
    // then the pill widens from the dots to the whole sentence in one move (laid out invisibly first)
    const before = pill.offsetWidth;
    el.classList.remove('thinking');
    const after = pill.offsetWidth;
    if (!reduced && after > before) {
      anim?.cancel();
      anim = pill.animate([{ clipPath: `inset(0px 0px 0px ${after - before}px round ${FACE / 2}px)` }, { clipPath: full }], { duration: 440, easing: OPEN, fill: 'forwards' });
    }
    live.textContent = line;
    if (reduced) { a.textContent = line; b.textContent = ''; }
    else {
      el.classList.add('typing');
      for (let i = 1; i <= line.length; i++) {
        if (id !== run) return;
        a.textContent = line.slice(0, i); b.textContent = line.slice(i);
        await sleep(delay(line[i - 1], line[i]));
      }
      el.classList.remove('typing');
    }
    foldT = setTimeout(() => fold(), o.hold ?? Math.max(3800, line.length * 70));
  }

  async function fold() {
    if (!open) return;
    const id = ++run;
    clearTimeout(foldT);
    open = false; cur = null;
    el.classList.remove('typing');
    feel.close();
    await morph('shut');
    if (id !== run) return;
    resting();
  }

  pill.addEventListener('click', () => {
    feel.tap();
    if (open && cur?.action) { const go = cur.action; fold(); go(); }
    else if (open) fold();
    else if (last) say(last.line, last);
  });
  pill.addEventListener('pointerenter', () => clearTimeout(foldT));
  pill.addEventListener('pointerleave', () => { if (open) foldT = setTimeout(fold, 2400); });

  const said = new WeakSet();
  function watch(target, line, o = {}) {
    if (!target || said.has(target)) return;
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      io.disconnect(); said.add(target);
      setTimeout(() => say(typeof line === 'function' ? line() : line, o), o.wait ?? 500);
    }, { threshold: o.threshold ?? .5 });
    io.observe(target);
  }

  return { say, watch, hush: fold, arrive, el };
}
