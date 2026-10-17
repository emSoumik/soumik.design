// Mochi: a real kitten (cut out of the "go study" meme) who sits on the bottom edge of the page,
// bottom-right, and rides along. She peeks up once, blinks, breathes, and changes mood with what's
// happening: planting, poking the bee, flicking through the shaders, scrolling fast, going idle.
// When she has something to say, a grey message bubble pops out beside her, shows typing dots,
// then the line. One rig, no frames: the photo plus two eyelids, a blush and a prop, all moved
// with transform and opacity. No rAF; just timers and CSS.
//
//   const mochi = createMochi()
//   mochi.say(text, { action, hold, mood })   // action(): what tapping her or the bubble does
//   mochi.watch(el, text | () => text, { action, threshold, wait, mood })   // say it once when el scrolls into view
//   mochi.hush()                               // fold the bubble now (e.g. when another panel opens)
//   mochi.mood(name, ms)                       // rest | curious | happy | point | surprised | smug | excited | typing | sleepy | sleep
import { feel } from './feel.js';

const ART = new URL('../assets/mochi/', import.meta.url).href;
const OUT = 'cubic-bezier(.23,1,.32,1)';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const delay = (ch, next) => /[.?!]/.test(ch) && next === ' ' ? 220 : /[,;:]/.test(ch) ? 110 : 16 + Math.random() * 8;
const pick = list => list[Math.floor(Math.random() * list.length)];

const TAP = [
  "hi, i'm mochi. i live down here.",
  'go study. or scroll, that works too.',
  'plant a flower. the bee loves it.',
  'no thoughts. just vibes.',
  "i'm not lazy, i'm saving energy.",
  'the shaders are down there. go look.',
];
const TAP_MOODS = ['happy', 'point', 'smug', 'excited', 'curious', 'typing'];
const PLANT = ['ooh, a flower.', "it's getting pretty out here.", "ok you're a gardener now."];
// which mood fits a watched spot, when the caller doesn't say
const SPOTS = [['#work-whyclub', 'excited'], ['#work-shaders', 'typing'], ['.wk-end', 'point']];
// a lid's closed amount per mood (0 open, 1 shut)
const LIDS = { rest: 0, curious: 0, point: .12, surprised: 0, smug: .42, happy: 1, excited: 1, typing: .3, sleepy: .62, sleep: 1, talk: 0 };
const PROPS = { point: '🫵', surprised: '❗', sleep: '💤', typing: '💻', happy: '✨' };

const CSS = `
.mo { --h: 84px; position: fixed; z-index: 60; right: max(10px, env(safe-area-inset-right)); bottom: env(safe-area-inset-bottom, 0px);
  display: flex; align-items: flex-end; gap: 2px; pointer-events: none; --lid: 0; }
@media (min-width: 641px) { .mo { --h: 100px; right: max(22px, env(safe-area-inset-right)); } }

/* the cat: sits on the bottom edge, peeks up once */
.mo-cat { all: unset; box-sizing: border-box; position: relative; flex: none; width: calc(var(--h) * .9167); height: var(--h); pointer-events: auto; cursor: pointer;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation; transform: translateY(104%); opacity: 0;
  transition: transform .75s ${SPRING}, opacity .3s ${OUT}; }
.mo.in .mo-cat { transform: none; opacity: 1; }
.mo-cat::before { content: ""; position: absolute; inset: -8px -6px 0; }
.mo-cat:focus-visible { outline: 1.5px solid #1d1c1b; outline-offset: 2px; border-radius: 14px; }
.mo-body { position: absolute; inset: 0; transform-origin: 50% 100%; transition: transform .45s ${SPRING}; }
.mo-cat:active .mo-body { transform: scale(.95, .9); transition-duration: .14s; transition-timing-function: ${OUT}; }
.mo-art { position: absolute; inset: 0; transform-origin: 50% 100%; animation: mo-breathe 3.4s ease-in-out infinite; }
.mo-art img { position: absolute; display: block; pointer-events: none; user-select: none; -webkit-user-drag: none; }
.mo-img { inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 4px 6px rgba(20,20,30,.16)); }
.mo-lid { width: 16.92%; height: 11.08%; transform-origin: 50% 0; transform: scaleY(var(--lid)); transition: transform .2s ${OUT}; }
.mo-lid.l { left: 17.52%; top: 45.15%; } .mo-lid.r { left: 50.76%; top: 45.71%; }
.mo.blink .mo-lid { transform: scaleY(1); transition-duration: .07s; }
.mo-blush { position: absolute; width: 15%; height: 7%; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,110,140,.5), rgba(255,110,140,0));
  opacity: 0; transition: opacity .3s ${OUT}; }
.mo-blush.l { left: 12%; top: 58%; } .mo-blush.r { left: 62%; top: 59%; }
.mo-prop { position: absolute; font: calc(var(--h) * .3)/1 "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; opacity: 0; pointer-events: none;
  transform: translate(6px, 6px) scale(.7); transition: opacity .2s ${OUT}, transform .35s ${SPRING}; }
.mo-prop.on { opacity: 1; transform: none; }
.mo-prop[data-p="🫵"] { left: -16%; bottom: 8%; font-size: calc(var(--h) * .36); }
.mo-prop[data-p="❗"] { right: -8%; top: -4%; }
.mo-prop[data-p="💤"] { right: -14%; top: -2%; }
.mo-prop[data-p="💻"] { left: 24%; bottom: -7%; font-size: calc(var(--h) * .34); }
.mo-prop[data-p="✨"] { left: -12%; top: 6%; }
.mo-zz.on { animation: mo-float 2.4s ease-in-out infinite; }
.mo-wig { position: absolute; inset: 22% -11% auto; height: 34%; display: flex; justify-content: space-between; opacity: 0; transition: opacity .2s ${OUT}; pointer-events: none; }
.mo-wig svg { width: 16%; height: 100%; fill: none; stroke: #2a2420; stroke-width: 2.2; stroke-linecap: round; }
.mo-wig svg:last-child { transform: scaleX(-1); }

/* moods */
.mo[data-mood="curious"] .mo-body { transform: rotate(-9deg) translateY(-2px); }
.mo[data-mood="point"] .mo-body { transform: translateY(-3px) scale(1.07); }
.mo[data-mood="smug"] .mo-body { transform: rotate(6deg); }
.mo[data-mood="talk"] .mo-art { animation: mo-nod .32s ease-in-out infinite alternate; }
.mo[data-mood="happy"] .mo-art { animation: mo-hop .52s ${OUT} 2; }
.mo[data-mood="surprised"] .mo-art { animation: mo-jolt .5s ${OUT}; }
.mo[data-mood="excited"] .mo-art { animation: mo-wiggle .13s ease-in-out 8 alternate; }
.mo[data-mood="typing"] .mo-art { animation: mo-nod .2s ease-in-out infinite alternate; }
.mo[data-mood="sleep"] .mo-body { transform: translateY(4%) scale(1.02, .95); }
.mo[data-mood="sleepy"] .mo-art, .mo[data-mood="sleep"] .mo-art { animation-duration: 5s; }
.mo[data-mood="happy"] .mo-blush, .mo[data-mood="excited"] .mo-blush, .mo[data-mood="smug"] .mo-blush { opacity: 1; }
.mo[data-mood="excited"] .mo-wig { opacity: 1; }
@keyframes mo-breathe { 50% { transform: scale(1.012, 1.03); } }
@keyframes mo-nod { to { transform: translateY(1.5%) rotate(-1.5deg); } }
@keyframes mo-hop { 0%, 100% { transform: none; } 18% { transform: scale(1.05, .92); } 50% { transform: translateY(-14%) scale(.97, 1.04); } 82% { transform: scale(1.04, .95); } }
@keyframes mo-jolt { 0% { transform: none; } 30% { transform: translateY(-12%) scale(1.06); } 60% { transform: scale(1.03, .96); } 100% { transform: none; } }
@keyframes mo-wiggle { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
@keyframes mo-float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(3px, -6px); } }

/* the message bubble: iMessage grey, tail pointing at her */
.mo-say { all: unset; box-sizing: border-box; position: relative; pointer-events: auto; cursor: pointer; margin-bottom: calc(var(--h) * .5);
  max-width: min(280px, calc(100vw - var(--h) - 40px)); padding: 8px 13px 9px; border-radius: 18px; background: #e9e9eb; color: #111;
  font: 400 15px/1.3 -apple-system, system-ui, sans-serif; text-wrap: pretty; -webkit-tap-highlight-color: transparent;
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
@media (min-width: 641px) { .mo-say { max-width: 320px; } }
@media (hover: hover) and (pointer: fine) { .mo-say:hover { background: #e2e2e5; } }
.mo-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

/* reduced motion: she still changes face and talks, she just doesn't move */
@media (prefers-reduced-motion: reduce) {
  .mo-cat { transform: none; transition: opacity .3s ease; }
  .mo-art, .mo[data-mood] .mo-art, .mo-dots i, .mo-zz.on { animation: none !important; }
  .mo[data-mood] .mo-body, .mo-cat:active .mo-body { transform: none; }
  .mo-body, .mo-lid, .mo-prop { transition: opacity .2s ease; }
  .mo-prop { transform: none; }
  .mo-say, .mo.open .mo-say { transform: none; transition: opacity .2s ease, visibility 0s; }
}
`;

const WIG = '<svg viewBox="0 0 16 34" aria-hidden="true"><path d="M12 4c-6 5-6 21 0 26M6 9c-3 4-3 12 0 16"/></svg>';

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
      <span class="mo-body"><span class="mo-art">
        <img class="mo-img" src="${ART}mochi.webp" alt="" width="220" height="240" decoding="async">
        <img class="mo-lid l" src="${ART}lid-l.webp" alt="" decoding="async"><img class="mo-lid r" src="${ART}lid-r.webp" alt="" decoding="async">
        <i class="mo-blush l"></i><i class="mo-blush r"></i>
        <span class="mo-wig">${WIG}${WIG}</span>
      </span><span class="mo-prop" aria-hidden="true"></span></span>
    </button><span class="mo-live" role="status"></span>`;
  document.body.appendChild(el);
  const bubble = el.querySelector('.mo-say'), cat = el.querySelector('.mo-cat'), prop = el.querySelector('.mo-prop'), live = el.querySelector('.mo-live');
  const [a, b] = el.querySelectorAll('.mo-text span');

  let open = false, run = 0, cur = null, last = null, foldT = 0, shown = false, lastSaid = 0;
  let base = 'rest', moodT = 0, blinkT = 0, idleT = 0, nap = 0, taps = [], tapIdx = 0;

  // ---- face ------------------------------------------------------------------------------
  function face(m) {
    el.dataset.mood = m;
    el.style.setProperty('--lid', LIDS[m] ?? 0);
    const p = PROPS[m] || '';
    if (p) { prop.textContent = p; prop.dataset.p = p; prop.classList.toggle('mo-zz', p === '💤'); requestAnimationFrame(() => prop.classList.add('on')); }
    else prop.classList.remove('on');
  }
  /** Show a mood for a while, then fall back to the resting one. */
  function mood(m, ms = 1800) {
    clearTimeout(moodT);
    if (m === 'sleepy' || m === 'sleep' || m === 'rest') { base = m; face(m); return; }
    face(m);
    if (ms !== Infinity) moodT = setTimeout(() => face(open ? 'talk' : base), ms);
  }
  // blinks every few seconds, only while she's awake and looking normal
  function blink() {
    clearTimeout(blinkT);
    blinkT = setTimeout(() => {
      if (!reduced && !document.hidden && LIDS[el.dataset.mood] < .5) {
        el.classList.add('blink');
        setTimeout(() => el.classList.remove('blink'), 110);
        if (Math.random() < .25) setTimeout(() => { el.classList.add('blink'); setTimeout(() => el.classList.remove('blink'), 110); }, 260);
      }
      blink();
    }, 2600 + Math.random() * 3600);
  }

  // ---- arriving -----------------------------------------------------------------------------
  function arrive() {
    if (shown) return; shown = true;
    el.classList.add('in');
    blink(); idle();
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
    if (reduced) { a.textContent = line; b.textContent = ''; }
    else {
      for (let i = 1; i <= line.length; i++) {
        if (id !== run) return;
        a.textContent = line.slice(0, i); b.textContent = line.slice(i);
        await sleep(delay(line[i - 1], line[i]));
      }
    }
    // the face holds a beat after the line lands, then settles while the bubble stays up
    clearTimeout(moodT);
    moodT = setTimeout(() => { if (open && id === run) face(m === 'talk' ? 'rest' : m); }, 900);
    foldT = setTimeout(() => fold(), o.hold ?? Math.max(4200, line.length * 75));
  }

  async function fold() {
    if (!open) return;
    ++run;
    clearTimeout(foldT); clearTimeout(moodT);
    open = false; cur = null;
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
    feel.tap();
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
      if (line) chime(line, { mood: 'happy' }); else if (!open) mood(pick(['happy', 'excited', 'curious']), 1400);
    } else if (t.closest('.bee')) {
      if (!beeTold) { beeTold = true; chime("hey, don't poke the bee.", { mood: 'surprised' }); } else if (!open) mood('surprised', 700);
    } else if (t.closest('.wk-screen, .wk-btns')) {
      if (!open) mood('typing', 1600);
    }
  });

  // coming back to the tab after a while
  let away = 0, toldBack = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { away = Date.now(); clearTimeout(idleT); return; }
    if (shown && !toldBack && Date.now() - away > 30000) { toldBack = true; base = 'rest'; setTimeout(() => chime("oh, you're back.", { mood: 'happy' }), 600); }
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
