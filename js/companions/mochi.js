// Mochi: the snow-leopard kitten from the sketch, paws on her head, peeking up over the bottom edge of the page,
// bottom-right, riding along. She pops up once, wiggles now and then, and changes mood with what's happening:
// planting, poking the bee, flicking through the shaders, scrolling fast, going idle.
// When she has something to say, a grey message bubble pops out beside her, shows typing dots,
// then the line. The art is one cut-out (assets/mochi/mochi.webp); every mood is a transform on it
// (tilts, hops, the excited head-shake, sinking down for a nap), run by CSS. No rAF, no frame timer.
//
//   const mochi = createMochi()
//   mochi.say(text, { action, hold, mood })   // action(): what tapping her or the bubble does
//   mochi.watch(el, text | () => text, { action, threshold, wait, mood })   // say it once when el scrolls into view
//   mochi.hush()                               // fold the bubble now (e.g. when another panel opens)
//   mochi.mood(name, ms)                       // rest | curious | happy | point | wave | surprised | smug | excited | typing | sleepy | sleep
import { feel } from '../feel.js';

const ART = new URL('../../assets/mochi/', import.meta.url).href;
const OUT = 'cubic-bezier(.23,1,.32,1)';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const delay = (ch, next) => /[.?!]/.test(ch) && next === ' ' ? 220 : /[,;:]/.test(ch) ? 110 : 16 + Math.random() * 8;
const pick = list => list[Math.floor(Math.random() * list.length)];

// the cut-out is 296×244; she's drawn at a width, the height follows
const AR = 244 / 296;

const TAP = [
  "hi, i'm mochi. i live down here.",
  'go study. or scroll, that works too.',
  'plant a flower. the bee loves it.',
  'no thoughts. just vibes.',
  "i'm not lazy, i'm saving energy.",
  'the shaders are down there. go look.',
];
const TAP_MOODS = ['wave', 'point', 'happy', 'curious', 'smug', 'excited'];
const PLANT = ['ooh, a flower.', "it's getting pretty out here.", "ok you're a gardener now."];
// which mood fits a watched spot, when the caller doesn't say
const SPOTS = [['#work-whyclub', 'excited'], ['#work-shaders', 'typing'], ['.wk-end', 'wave']];

const CSS = `
.mo { --w: 104px; position: fixed; z-index: 60; right: max(6px, env(safe-area-inset-right)); bottom: env(safe-area-inset-bottom, 0px);
  display: flex; align-items: flex-end; gap: 4px; pointer-events: none; }
@media (min-width: 641px) { .mo { --w: 138px; right: max(18px, env(safe-area-inset-right)); } }

/* the cat: sits on the bottom edge, peeks up once */
.mo-cat { all: unset; box-sizing: border-box; position: relative; flex: none; width: var(--w); height: calc(var(--w) * ${AR});
  pointer-events: auto; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transform: translateY(104%); transition: transform .8s ${SPRING}; }
.mo.in .mo-cat { transform: none; }
.mo-cat::before { content: ""; position: absolute; inset: -6px -4px 0; }
.mo-cat:focus-visible { outline: 1.5px solid #1d1c1b; outline-offset: 2px; border-radius: 10px; }
.mo-body { position: absolute; inset: 0; transform-origin: 50% 100%; transition: transform .5s ${SPRING}; }
.mo-body picture { display: contents; }
.mo-body img { display: block; width: 100%; height: 100%; user-select: none; -webkit-user-drag: none; }
.mo-cat:active .mo-body { scale: .96; }

/* moods: held poses ease in; little hops and shakes play once */
.mo[data-mood="curious"] .mo-body { transform: rotate(-7deg); }
.mo[data-mood="smug"] .mo-body { transform: rotate(6deg) translateY(4%); }
.mo[data-mood="point"] .mo-body, .mo[data-mood="talk"] .mo-body { transform: rotate(-4deg) translateX(-3%); }
.mo[data-mood="sleepy"] .mo-body { transform: translateY(16%); transition-duration: 1.4s; }
.mo[data-mood="sleep"] .mo-body { transform: translateY(34%); transition: transform 1.6s ${OUT}; }
.mo[data-mood="talk"] .mo-body { animation: mo-talk .9s steps(2, jump-none) infinite; }
.mo[data-mood="typing"] .mo-body { animation: mo-talk .5s steps(2, jump-none) 3; }
.mo[data-mood="happy"] .mo-body { animation: mo-hop .6s ${OUT} 2; }
.mo[data-mood="surprised"] .mo-body { animation: mo-jolt .5s ${OUT}; }
.mo[data-mood="excited"] .mo-body, .mo-body.wig { animation: mo-shake .1s steps(1, end) 7; }
.mo[data-mood="wave"] .mo-body { animation: mo-sway .9s ease-in-out 2; }
.mo[data-mood="sleep"] .mo-body img { animation: mo-breathe 3.4s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes mo-talk { from { translate: 0 0; } to { translate: 0 -2px; } }
@keyframes mo-hop { 0%, 100% { translate: 0 0; } 40% { translate: 0 -9%; } 70% { translate: 0 -2%; } }
@keyframes mo-jolt { 0% { translate: 0 0; } 18% { translate: 0 -12%; scale: 1.04 .97; } 55% { translate: 0 -3%; } 100% { translate: 0 0; } }
@keyframes mo-shake { 0% { rotate: -4deg; } 50% { rotate: 4deg; } }
@keyframes mo-sway { 0%, 100% { rotate: 0deg; } 30% { rotate: -6deg; } 70% { rotate: 5deg; } }
@keyframes mo-breathe { 0%, 100% { scale: 1 1; } 50% { scale: 1.015 1.03; } }

/* z's while she naps, drifting up off her head */
.mo-z { position: absolute; left: 66%; top: 0; width: 30%; height: 36%; pointer-events: none; opacity: 0; transition: opacity .3s ${OUT};
  font: 600 18px/1 var(--pixel, ui-monospace, monospace); color: #2e2a27; }
.mo[data-mood="sleep"] .mo-z { opacity: 1; }
.mo-z i { position: absolute; left: 0; bottom: 0; font-style: normal; opacity: 0; }
.mo[data-mood="sleep"] .mo-z i { animation: mo-z 3s steps(6, end) infinite; }
.mo-z i:nth-child(2) { animation-delay: 1s !important; font-size: .8em; } .mo-z i:nth-child(3) { animation-delay: 2s !important; font-size: .65em; }
@keyframes mo-z { 0% { opacity: 0; transform: none; } 15% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(14px, -30px); } }

/* the message bubble: iMessage grey, tail pointing at her */
.mo-say { all: unset; box-sizing: border-box; position: relative; pointer-events: auto; cursor: pointer; margin-bottom: calc(var(--w) * .5);
  max-width: min(280px, calc(100vw - var(--w) - 28px)); padding: 8px 13px 9px; border-radius: 18px; background: #e9e9eb; color: #111;
  font: 500 15px/1.3 var(--pixel, -apple-system, system-ui, sans-serif); letter-spacing: .01em; text-wrap: pretty; -webkit-tap-highlight-color: transparent;
  transform-origin: 100% 100%; opacity: 0; transform: translate(8px, 6px) scale(.85); visibility: hidden;
  transition: opacity .18s ${OUT}, transform .18s ${OUT}, visibility 0s .18s; }
.mo.open .mo-say { opacity: 1; transform: none; visibility: visible; transition: opacity .2s ${OUT}, transform .42s ${SPRING}, visibility 0s; }
.mo-say::after { content: ""; position: absolute; right: -5px; bottom: 0; width: 16px; height: 18px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 18'%3E%3Cpath d='M0 0v18h16c-5-1-9-5-9-12V0z' fill='%23e9e9eb'/%3E%3C/svg%3E") no-repeat; }
.mo-say:focus-visible { outline: 1.5px solid #1d1c1b; outline-offset: 3px; }
.mo-say .b { visibility: hidden; }
.mo-dots { display: none; gap: 4px; padding: 5px 2px; }
.mo-dots i { width: 7px; height: 7px; border-radius: 50%; background: #8e8e93; animation: mo-dot 1s ease-in-out infinite; }
.mo-dots i:nth-child(2) { animation-delay: .15s; } .mo-dots i:nth-child(3) { animation-delay: .3s; }
.mo.thinking .mo-dots { display: flex; } .mo.thinking .mo-text { display: none; }
@keyframes mo-dot { 0%, 100% { opacity: .4; transform: none; } 50% { opacity: 1; transform: translateY(-2px); } }
@media (min-width: 641px) { .mo-say { max-width: 320px; font-size: 16px; } }
@media (hover: hover) and (pointer: fine) { .mo-say:hover { background: #e2e2e5; } }
.mo-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

/* reduced motion: she still changes pose and talks, she just doesn't bounce */
@media (prefers-reduced-motion: reduce) {
  .mo-cat { transform: none; opacity: 0; transition: opacity .3s ease; } .mo.in .mo-cat { opacity: 1; }
  .mo-body, .mo[data-mood] .mo-body { transition: none; animation: none !important; }
  .mo-dots i, .mo[data-mood] .mo-z i, .mo-body img { animation: none !important; }
  .mo[data-mood="sleep"] .mo-z i:first-child { opacity: 1; }
  .mo-say, .mo.open .mo-say { transform: none; transition: opacity .2s ease, visibility 0s; }
}
`;

export function createMochi() {
  if (!document.getElementById('mo-style')) document.head.insertAdjacentHTML('beforeend', `<style id="mo-style">${CSS}</style>`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const el = document.createElement('div');
  el.className = 'mo';
  el.dataset.mood = 'rest';
  el.innerHTML = `<button class="mo-say" type="button" tabindex="-1">
      <span class="mo-text" aria-hidden="true"><span class="a"></span><span class="b"></span></span>
      <span class="mo-dots" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <button class="mo-cat" type="button" aria-label="mochi the cat. tap her for a line">
      <span class="mo-body"><picture><source type="image/avif"><img alt="" width="296" height="244" decoding="async"></picture></span>
      <span class="mo-z" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>
    </button><span class="mo-live" role="status"></span>`;
  document.body.appendChild(el);
  const bubble = el.querySelector('.mo-say'), cat = el.querySelector('.mo-cat'), live = el.querySelector('.mo-live');
  const [a, b] = el.querySelectorAll('.mo-text span');

  let open = false, speaking = false, run = 0, cur = null, last = null, foldT = 0, shown = false, lastSaid = 0;
  let base = 'rest', moodT = 0, ambT = 0, idleT = 0, nap = 0, taps = [], tapIdx = 0;

  // ---- face ------------------------------------------------------------------------------
  // a mood is a data attribute; the CSS holds the pose. setting the same one again replays its little animation
  const body = el.querySelector('.mo-body');
  function face(m) {
    if (el.dataset.mood === m) { el.dataset.mood = 'rest'; void body.offsetWidth; }
    el.dataset.mood = m;
  }
  /** Show a mood for a while, then fall back to the resting one. */
  function mood(m, ms = 1800) {
    clearTimeout(moodT);
    if (m === 'sleepy' || m === 'sleep' || m === 'rest') { base = m; face(m); return; }
    face(m);
    if (ms !== Infinity) moodT = setTimeout(() => face(speaking ? 'talk' : open ? 'rest' : base), ms);
  }
  // every so often while she's awake and resting: the head-shake from the sketch
  function ambient() {
    clearTimeout(ambT);
    ambT = setTimeout(() => {
      if (!reduced && !document.hidden && !open && el.dataset.mood === 'rest') {
        body.classList.remove('wig'); void body.offsetWidth; body.classList.add('wig');
      }
      ambient();
    }, 6000 + Math.random() * 9000);
  }
  body.addEventListener('animationend', () => body.classList.remove('wig'));

  // ---- arriving -----------------------------------------------------------------------------
  function arrive() {
    if (shown) return; shown = true;
    // she's only fetched when she's about to show up, so the first paint is just the garden
    const img = body.querySelector('img');
    const up = () => requestAnimationFrame(() => el.classList.add('in'));
    img.addEventListener('load', up, { once: true }); img.addEventListener('error', up, { once: true });
    body.querySelector('source').srcset = ART + 'mochi.avif';
    img.src = ART + 'mochi.webp';
    ambient(); idle();
    setTimeout(() => { if (!open) mood('curious', 1200); }, reduced ? 0 : 800);
  }

  // ---- talking ------------------------------------------------------------------------------
  async function say(line, o = {}) {
    arrive();
    if (open) { await fold(); await sleep(reduced ? 0 : 160); }
    const id = ++run;
    clearTimeout(foldT);
    wake();
    cur = { line, ...o }; last = cur; lastSaid = Date.now();
    a.textContent = ''; b.textContent = line;
    bubble.setAttribute('aria-label', o.action ? `${line} (tap to go)` : line);
    bubble.tabIndex = 0;
    el.classList.add('thinking', 'open');
    open = true;
    const m = o.mood || (o.action ? 'point' : 'talk');
    mood(m, Infinity);
    feel.pop();
    await sleep(reduced ? 0 : 520);
    if (id !== run) return;
    el.classList.remove('thinking');
    live.textContent = line;
    speaking = true;
    if (reduced) { a.textContent = line; b.textContent = ''; }
    else {
      for (let i = 1; i <= line.length; i++) {
        if (id !== run) { speaking = false; return; }
        a.textContent = line.slice(0, i); b.textContent = line.slice(i);
        await sleep(delay(line[i - 1], line[i]));
      }
    }
    speaking = false;
    // the face holds a beat after the line lands, then settles while the bubble stays up
    clearTimeout(moodT);
    moodT = setTimeout(() => { if (open && id === run) face(m === 'talk' || m === 'excited' || m === 'typing' ? 'rest' : m); }, 900);
    foldT = setTimeout(() => fold(), o.hold ?? Math.max(4200, line.length * 75));
  }

  async function fold() {
    if (!open) return;
    ++run;
    clearTimeout(foldT); clearTimeout(moodT);
    open = false; speaking = false; cur = null;
    el.classList.remove('open', 'thinking');
    bubble.tabIndex = -1;
    feel.close();
    face(base);
    await sleep(reduced ? 0 : 180);
  }

  // unsolicited lines wait their turn, and never talk over her
  const chime = (line, o) => { if (!open && shown && Date.now() - lastSaid > 7000) say(line, o); else mood(o?.mood || 'happy', 1400); };

  // ---- tapping her ---------------------------------------------------------------------------
  function poke() {
    feel.mew();
    const now = Date.now();
    taps = taps.filter(t => now - t < 1600); taps.push(now);
    if (open && cur?.action) { const go = cur.action; fold(); go(); return; }
    if (taps.length >= 4) { taps = []; say("ok ok, i'm awake.", { mood: 'smug' }); return; }
    // tapping again while she's talking skips to her next line
    say(TAP[tapIdx % TAP.length], { mood: TAP_MOODS[tapIdx % TAP_MOODS.length] });
    tapIdx++;
  }
  cat.addEventListener('click', poke);
  bubble.addEventListener('click', () => { feel.tap(); if (cur?.action) { const go = cur.action; fold(); go(); } else fold(); });
  bubble.addEventListener('pointerenter', () => clearTimeout(foldT));
  bubble.addEventListener('pointerleave', () => { if (open) foldT = setTimeout(fold, 2400); });
  if (fine) {
    // hovering her: she tilts her head up at you
    cat.addEventListener('pointerenter', () => { wake(); if (!open && el.dataset.mood === base) mood('curious', Infinity); });
    cat.addEventListener('pointerleave', () => { if (!open && el.dataset.mood === 'curious') mood(base); });
  }

  // ---- naps -----------------------------------------------------------------------------------
  function idle() {
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      if (open) return idle();
      mood('sleepy');
      idleT = setTimeout(() => { if (!open) { mood('sleep'); nap++; } }, 12000);
    }, 24000);
  }
  let lastAct = 0;
  function wake() {
    const now = Date.now();
    if (base !== 'rest') {
      const wasAsleep = base === 'sleep';
      base = 'rest';
      if (wasAsleep && nap === 1 && !open) { nap++; setTimeout(() => chime('huh? oh. hi.', { mood: 'surprised' }), 300); }
      else if (!open) mood(wasAsleep ? 'surprised' : 'rest', 700);
    }
    if (now - lastAct > 800) { lastAct = now; if (shown) idle(); }
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, wake, { passive: true }));

  // ---- the rest of the page -------------------------------------------------------------------
  // scrolling: a fast fling startles her once in a while; coming back up to the garden gets a nudge
  let sy = scrollY, st = performance.now(), wentDown = false, toldTop = false, startled = 0, toldFast = false;
  addEventListener('scroll', () => {
    const now = performance.now(), v = Math.abs(scrollY - sy) / Math.max(1, now - st);
    sy = scrollY; st = now;
    wake();
    if (!shown) return;
    if (v > 3.2 && !open && now - startled > 6000) {
      startled = now;
      if (!toldFast) { toldFast = true; chime('whoa, slow down.', { mood: 'surprised' }); } else mood('surprised', 700);
    }
    if (scrollY > innerHeight * 1.2) wentDown = true;
    if (wentDown && !toldTop && scrollY < 40) { toldTop = true; setTimeout(() => chime('back to the garden. plant one.', { mood: 'happy' }), 400); }
  }, { passive: true });

  // planting flowers in the garden, poking the bee, flicking through the shader reel
  let planted = 0, beeTold = false;
  document.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof Element) || !shown || el.contains(t)) return;
    if (t.closest('#garden, #hint')) {
      planted++;
      const line = { 1: PLANT[0], 4: PLANT[1], 9: PLANT[2] }[planted];
      if (line) chime(line, { mood: planted === 9 ? 'excited' : 'happy' }); else if (!open) mood(pick(['happy', 'excited', 'curious']), 1400);
    } else if (t.closest('.bee')) {
      if (!beeTold) { beeTold = true; chime("hey, don't poke the bee.", { mood: 'surprised' }); } else if (!open) mood('surprised', 700);
    } else if (t.closest('.wk-screen, .wk-btns')) {
      if (!open) mood('typing', 1600);
    }
  });

  // coming back to the tab after a while; frame loops pause while the tab is hidden
  let away = 0, toldBack = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { away = Date.now(); clearTimeout(idleT); return; }
    if (shown && !toldBack && Date.now() - away > 30000) { toldBack = true; base = 'rest'; setTimeout(() => chime("oh, you're back.", { mood: 'wave' }), 600); }
    if (shown) idle();
  });

  // ---- one line per spot, the first time it scrolls into view ---------------------------------
  const said = new WeakSet();
  function watch(target, line, o = {}) {
    if (!target || said.has(target)) return;
    const spot = SPOTS.find(([s]) => target.closest(s));
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      io.disconnect(); said.add(target);
      setTimeout(() => say(typeof line === 'function' ? line() : line, { mood: spot?.[1], ...o }), o.wait ?? 500);
    }, { threshold: o.threshold ?? .5 });
    io.observe(target);
  }

  // another panel is opening: fold up and glance over at it
  function hush() { const f = fold(); if (shown) mood('curious', 1600); return f; }

  return { say, watch, hush, arrive, mood, el };
}
