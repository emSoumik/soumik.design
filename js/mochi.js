// Mochi: a pixel-art snow-leopard kitten at a little laptop, sitting on the bottom edge of the page,
// bottom-right, riding along. She peeks up once, blinks, types in little bursts, and changes mood with
// what's happening: planting, poking the bee, flicking through the shaders, scrolling fast, going idle.
// When she has something to say, a grey message bubble pops out beside her, shows typing dots,
// then the line. The art is one sprite sheet (assets/mochi/sheet.webp, 14 frames of 52×44) drawn
// at a whole-number scale; frames step like real pixel art. One timeout steps frames, and only while
// an animated mood is playing; at rest the only timer is the blink/typing-burst one. No rAF.
//
//   const mochi = createMochi()
//   mochi.say(text, { action, hold, mood })   // action(): what tapping her or the bubble does
//   mochi.watch(el, text | () => text, { action, threshold, wait, mood })   // say it once when el scrolls into view
//   mochi.hush()                               // fold the bubble now (e.g. when another panel opens)
//   mochi.mood(name, ms)                       // rest | curious | happy | point | wave | surprised | smug | excited | typing | sleepy | sleep
import { feel } from './feel.js';

const ART = new URL('../assets/mochi/', import.meta.url).href;
const OUT = 'cubic-bezier(.23,1,.32,1)';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const delay = (ch, next) => /[.?!]/.test(ch) && next === ' ' ? 220 : /[,;:]/.test(ch) ? 110 : 16 + Math.random() * 8;
const pick = list => list[Math.floor(Math.random() * list.length)];

// the sheet: one row of frames, each FW×FH art pixels
const FW = 52, FH = 44;
const FRAMES = ['type_a', 'type_b', 'blink', 'talk', 'excited_a', 'excited_b', 'happy', 'surprised',
  'sleepy', 'sleep', 'wave_a', 'wave_b', 'point', 'curious'];
const F = Object.fromEntries(FRAMES.map((n, i) => [n, i]));
// which frames each mood plays, and how fast (frames per second) when it has more than one
const MOODS = {
  rest: ['type_a'], talk: ['talk', 'type_a'], typing: ['type_a', 'type_b'], curious: ['curious'],
  point: ['point'], wave: ['wave_a', 'wave_b'], happy: ['happy'], smug: ['sleepy'], surprised: ['surprised'],
  excited: ['excited_a', 'excited_b'], sleepy: ['sleepy'], sleep: ['sleep'],
};
const FPS = { talk: 6, typing: 8, wave: 4, excited: 9 };
const BLINKS = new Set(['rest', 'typing']);   // moods drawn with the plain open-eyed face

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
.mo { --u: 2px; position: fixed; z-index: 60; right: max(8px, env(safe-area-inset-right)); bottom: env(safe-area-inset-bottom, 0px);
  display: flex; align-items: flex-end; gap: 2px; pointer-events: none; --f: 0; }
@media (min-width: 641px) { .mo { --u: 3px; right: max(18px, env(safe-area-inset-right)); } }

/* the cat: sits on the bottom edge, peeks up once */
.mo-cat { all: unset; box-sizing: border-box; position: relative; flex: none; width: calc(var(--u) * ${FW}); height: calc(var(--u) * ${FH});
  pointer-events: auto; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transform: translateY(104%); opacity: 0; transition: transform .75s ${SPRING}, opacity .3s ${OUT}; }
.mo.in .mo-cat { transform: none; opacity: 1; }
.mo-cat::before { content: ""; position: absolute; inset: -6px -4px 0; }
.mo-cat:focus-visible { outline: 1.5px solid #1d1c1b; outline-offset: 2px; border-radius: 6px; }
.mo-body { position: absolute; inset: 0; }
.mo-cat:active .mo-body { transform: translateY(var(--u)); }
.mo-spr { position: absolute; inset: 0; image-rendering: pixelated;
  background: url("${ART}sheet.png") no-repeat;
  background-image: image-set(url("${ART}sheet.webp") type("image/webp"), url("${ART}sheet.png") type("image/png"));
  background-size: calc(var(--u) * ${FW * FRAMES.length}) calc(var(--u) * ${FH});
  background-position: calc(var(--u) * ${-FW} * var(--f)) 0; }

/* little stepped hops, in whole art pixels */
.mo[data-mood="happy"] .mo-body { animation: mo-hop .56s steps(1, end) 2; }
.mo[data-mood="surprised"] .mo-body { animation: mo-jolt .5s steps(1, end); }
@keyframes mo-hop { 0% { transform: none; } 20% { transform: translateY(calc(var(--u) * -2)); } 40% { transform: translateY(calc(var(--u) * -3)); }
  60% { transform: translateY(calc(var(--u) * -2)); } 80%, 100% { transform: none; } }
@keyframes mo-jolt { 0% { transform: none; } 15% { transform: translateY(calc(var(--u) * -3)); } 45% { transform: translateY(calc(var(--u) * -1)); } 70%, 100% { transform: none; } }

/* z's while she naps: pixel letters drifting up off her head */
.mo-z { position: absolute; left: 71%; top: -14%; width: 30%; height: 36%; pointer-events: none; opacity: 0; transition: opacity .3s ${OUT};
  font: 600 calc(var(--u) * 6)/1 var(--pixel, ui-monospace, monospace); color: #2e2a27; }
.mo[data-mood="sleep"] .mo-z { opacity: 1; }
.mo-z i { position: absolute; left: 0; bottom: 0; font-style: normal; opacity: 0; }
.mo[data-mood="sleep"] .mo-z i { animation: mo-z 3s steps(6, end) infinite; }
.mo-z i:nth-child(2) { animation-delay: 1s !important; font-size: .8em; } .mo-z i:nth-child(3) { animation-delay: 2s !important; font-size: .65em; }
@keyframes mo-z { 0% { opacity: 0; transform: none; } 15% { opacity: 1; } 75% { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--u) * 6), calc(var(--u) * -12)); } }

/* the message bubble: iMessage grey, tail pointing at her */
.mo-say { all: unset; box-sizing: border-box; position: relative; pointer-events: auto; cursor: pointer; margin-bottom: calc(var(--u) * 24);
  max-width: min(280px, calc(100vw - var(--u) * ${FW} - 30px)); padding: 8px 13px 9px; border-radius: 18px; background: #e9e9eb; color: #111;
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

/* reduced motion: she still changes face and talks, she just doesn't move */
@media (prefers-reduced-motion: reduce) {
  .mo-cat { transform: none; transition: opacity .3s ease; }
  .mo[data-mood] .mo-body, .mo-dots i, .mo[data-mood] .mo-z i { animation: none !important; }
  .mo-cat:active .mo-body { transform: none; }
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
      <span class="mo-body"><span class="mo-spr"></span></span>
      <span class="mo-z" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>
    </button><span class="mo-live" role="status"></span>`;
  document.body.appendChild(el);
  const bubble = el.querySelector('.mo-say'), cat = el.querySelector('.mo-cat'), live = el.querySelector('.mo-live');
  const [a, b] = el.querySelectorAll('.mo-text span');

  // whole device pixels per art pixel, so every art pixel is the same size on any screen
  const wide = matchMedia('(min-width: 641px)');
  function fit() {
    const dpr = devicePixelRatio || 1;
    el.style.setProperty('--u', `${Math.max(1, Math.round((wide.matches ? 3 : 2) * dpr)) / dpr}px`);
  }
  fit();
  wide.addEventListener('change', fit);
  addEventListener('resize', fit, { passive: true });

  let open = false, speaking = false, run = 0, cur = null, last = null, foldT = 0, shown = false, lastSaid = 0;
  let base = 'rest', moodT = 0, ambT = 0, idleT = 0, nap = 0, taps = [], tapIdx = 0;

  // ---- frames ----------------------------------------------------------------------------
  // one timeout steps the current loop; it stops on its own when the loop has a step budget
  let loop = MOODS.rest, li = 0, animT = 0, playing = false;
  const show = i => el.style.setProperty('--f', i);
  function play(list, fps, steps = Infinity) {
    clearTimeout(animT);
    loop = list; li = 0; playing = false;
    show(F[list[0]]);
    if (reduced || list.length < 2 || !fps) return;
    playing = true;
    const step = () => {
      if (document.hidden || steps-- <= 0) { playing = false; show(F[loop[0]]); return; }
      li = (li + 1) % loop.length; show(F[loop[li]]);
      animT = setTimeout(step, 1000 / fps);
    };
    animT = setTimeout(step, 1000 / fps);
  }

  // ---- face ------------------------------------------------------------------------------
  function face(m) {
    el.dataset.mood = m;
    play(MOODS[m] || MOODS.rest, FPS[m]);
  }
  /** Show a mood for a while, then fall back to the resting one. */
  function mood(m, ms = 1800) {
    clearTimeout(moodT);
    if (m === 'sleepy' || m === 'sleep' || m === 'rest') { base = m; face(m); return; }
    face(m);
    if (ms !== Infinity) moodT = setTimeout(() => face(speaking ? 'talk' : open ? 'rest' : base), ms);
  }
  // every few seconds while she's awake: a blink, or a little burst of typing at rest
  function ambient() {
    clearTimeout(ambT);
    ambT = setTimeout(() => {
      const m = el.dataset.mood;
      if (!reduced && !document.hidden && !playing && BLINKS.has(m)) {
        if (m === 'rest' && Math.random() < .45) play(MOODS.typing, FPS.typing, 10 + Math.floor(Math.random() * 14));
        else {
          const wink = () => { show(F.blink); setTimeout(() => { if (!playing && el.dataset.mood === m) show(F[loop[li]]); }, 110); };
          wink();
          if (Math.random() < .25) setTimeout(wink, 260);
        }
      }
      ambient();
    }, 2600 + Math.random() * 3600);
  }

  // ---- arriving -----------------------------------------------------------------------------
  function arrive() {
    if (shown) return; shown = true;
    el.classList.add('in');
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
    if (FPS[el.dataset.mood]) face(el.dataset.mood);
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
