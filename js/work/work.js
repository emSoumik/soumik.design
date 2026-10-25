// The work section: lives on the home page, directly below the garden hero.
// mountWork(section) -> { destroy() }
// Fills <section id="work"> with an opener, WhyClub (the slideshow), Shaders (the reel) and a quiet
// closing. Mochi (js/mochi.js) narrates from the corner; nothing here knows about her.
import { EMAIL, SOCIALS, WHYCLUB, SHADERS } from '../content.js';

const FONT_URL = '/assets/fonts/faculty-glyphic.woff2';
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&display=swap';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const AUTO_MS = 5000;

const pad = (n) => String(n).padStart(2, '0');

function injectCSS() {
  if (document.getElementById('wk-css')) return;
  if (![...document.querySelectorAll('link[rel=stylesheet]')].some((l) => /Instrument\+Sans/.test(l.href))) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = FONTS;
    document.head.appendChild(l);
  }
  const s = document.createElement('style');
  s.id = 'wk-css';
  s.textContent = `@font-face{font-family:"Faculty Glyphic";src:url(${FONT_URL}) format("woff2");font-display:swap}` + STYLE;
  document.head.appendChild(s);
}

const ARROW_L = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7.5 3.5 3 8l4.5 4.5"/></svg>';
const ARROW_R = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8.5 3.5 13 8l-4.5 4.5"/></svg>';

const project = ({ n, id, title, line, tags, href, domain, more = '', stage }) => `
  <article class="wk-p" id="${id}">
    <header class="wk-head">
      <span class="wk-idx" data-wk-r>${n} / 02</span>
      <h3 class="wk-title" data-wk-r>${title}</h3>
      <a class="wk-link" data-wk-r href="${href}" target="_blank" rel="noopener">${domain} <span aria-hidden="true">↗</span></a>
      <p class="wk-line" data-wk-r>${line}</p>
      <p class="wk-meta" data-wk-r>${tags}</p>
      ${more && `<p class="wk-more" data-wk-r>${more}</p>`}
    </header>
    ${stage}
  </article>`;

export function mountWork(section) {
  injectCSS();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(hover: none)');
  const linkedin = SOCIALS.find((s) => /linkedin/i.test(s.label));
  const x = SOCIALS.find((s) => s.label === 'X');
  const ext = (s) => (s ? `<a href="${s.href}" target="_blank" rel="noopener">${s.label} <span aria-hidden="true">↗</span></a>` : '');

  section.classList.add('wk-root');
  section.innerHTML = `
    <div class="wk-col">
      <div class="wk-open">
        <p class="wk-label" data-wk-r>my work</p>
        <h2 class="wk-h2" data-wk-r style="--d:.08s">Things I designed and built, <em>end to end.</em></h2>
      </div>

      ${project({
        n: '01', id: 'work-whyclub', title: 'WhyClub',
        line: 'A streetwear label I built alone, end to end: the brand, the product design, the storefront, and the backend that runs every order.',
        tags: 'brand · product design · frontend · backend', href: WHYCLUB.href, domain: WHYCLUB.domain,
        stage: '<div class="wk-stage wk-wc is-pending" data-wk-r></div>',
      })}

      ${project({
        n: '02', id: 'work-shaders', title: 'Shaders',
        line: 'A drop pass that blooms after you order, riso badges, and a 404 made of light. Live WebGL, written by hand for WhyClub.',
        tags: 'glsl · webgl · motion', href: SHADERS.href, domain: 'prototype<span class="wk-dom">.whyclub.in</span>',
        more: `<a href="${SHADERS.href}" target="_blank" rel="noopener">try the drop pass <span aria-hidden="true">↗</span></a><a href="${SHADERS.built}" target="_blank" rel="noopener">how it was built <span aria-hidden="true">↗</span></a>`,
        stage: `
        <div class="wk-stage wk-rl" data-wk-r>
          <div class="wk-screen" tabindex="0" role="group" aria-roledescription="carousel" aria-label="Shader reel. Use the left and right arrow keys to browse.">
            <canvas aria-hidden="true"></canvas>
            <div class="wk-cap" aria-live="off"><b class="wk-rt"></b><span class="wk-rs"></span></div>
          </div>
          <div class="wk-ctl">
            <span class="wk-count" aria-live="polite">01 / 07</span>
            <span class="wk-bar" aria-hidden="true"><i></i></span>
            <span class="wk-btns">
              <button type="button" data-p aria-label="Previous shader">${ARROW_L}</button>
              <button type="button" data-n aria-label="Next shader">${ARROW_R}</button>
            </span>
          </div>
          <p class="wk-hint"></p>
        </div>`,
      })}

      <footer class="wk-end">
        <p class="wk-hi" data-wk-r>Say <em>hi</em></p>
        <a class="wk-mail" data-wk-r style="--d:.06s" href="mailto:${EMAIL}">${EMAIL}</a>
        <p class="wk-soc" data-wk-r style="--d:.12s">${ext(linkedin)}${ext(x)}</p>
        <a class="wk-top" data-wk-r style="--d:.18s" href="#top"><span aria-hidden="true">↑</span> back to the garden</a>
      </footer>
    </div>`;

  const $ = (s) => section.querySelector(s);
  const cleanups = [];
  let dead = false;
  const observe = (el, cb, opts) => {
    if (!('IntersectionObserver' in window)) { cb(true); return null; }
    const io = new IntersectionObserver((es) => cb(es[es.length - 1].isIntersecting, io), opts);
    io.observe(el);
    cleanups.push(() => io.disconnect());
    return io;
  };

  // ---- hint copy ----------------------------------------------------------------------
  const hintEl = $('.wk-hint');
  const paintHint = () => { hintEl.textContent = touch.matches ? 'swipe or tap to move on' : 'click to move on, or use ← →'; };
  paintHint();
  touch.addEventListener?.('change', paintHint);
  cleanups.push(() => touch.removeEventListener?.('change', paintHint));

  // ---- reveal on scroll ---------------------------------------------------------------
  if (!reduced.matches) {
    section.classList.add('wk-armed');
    section.querySelectorAll('[data-wk-r]').forEach((el) => {
      observe(el, (on, io) => { if (on) { el.classList.add('is-in'); io?.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    });
  }

  // ---- project 1: the slideshow -------------------------------------------------------
  const wc = $('.wk-wc');
  let show = null;
  observe(wc, async (on, io) => {
    if (!on) return;
    io?.disconnect();
    try {
      const { mountSlideshow } = await import('./slideshow.js');
      if (dead) return;
      show = mountSlideshow(wc, { device: 'auto' });
      wc.classList.remove('is-pending');
    } catch { wc.classList.remove('is-pending'); }
  }, { rootMargin: '40% 0px 40% 0px' });

  // ---- project 2: the reel ------------------------------------------------------------
  const rl = $('.wk-rl');
  const screen = rl.querySelector('.wk-screen');
  const canvas = screen.querySelector('canvas');
  const titleEl = rl.querySelector('.wk-rt');
  const subEl = rl.querySelector('.wk-rs');
  const countEl = rl.querySelector('.wk-count');
  const fill = rl.querySelector('.wk-bar i');
  let api = null;
  let total = 7;
  let p = 0, last = 0, raf = 0, inView = false, hover = false, press = false, focused = false, ticking = false;

  const playing = () => api && !reduced.matches && inView && !hover && !press && !focused && !document.hidden && !dead;
  const paintFill = () => { fill.style.transform = `scaleX(${p})`; };
  const sync = () => {
    if (playing()) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  function tick(t) {
    raf = 0;
    if (!playing()) return;
    p += Math.min(t - last, 64) / AUTO_MS;
    last = t;
    if (p >= 1) { p = 0; paintFill(); api.next(); }
    else paintFill();
    raf = requestAnimationFrame(tick);
  }
  observe(rl, (on) => { inView = on; sync(); }, { threshold: 0.25 });
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVis));

  const go = (dir) => { if (!api) return; p = 0; paintFill(); dir > 0 ? api.next() : api.prev(); };

  async function mountReel() {
    const [{ createReel, SCENES }] = await Promise.all([import('./reel.js')]);
    if (dead) return;
    total = SCENES.length;
    api = createReel(canvas, {
      onChange(i, s) {
        p = 0;
        paintFill();
        titleEl.textContent = s.title;
        subEl.textContent = s.caption;
        countEl.textContent = `${pad(i + 1)} / ${pad(total)}`;
        screen.classList.toggle('light', !s.dark);
        screen.classList.remove('swap');
        void screen.offsetWidth;
        screen.classList.add('swap');
      },
      onFail() { screen.classList.add('failed'); },
    });
    sync();
  }
  observe(rl, (on, io) => { if (on) { io?.disconnect(); mountReel(); } }, { rootMargin: '30% 0px 30% 0px' });

  rl.querySelector('[data-n]').addEventListener('click', () => go(1));
  rl.querySelector('[data-p]').addEventListener('click', () => go(-1));
  screen.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  screen.addEventListener('focusin', () => { focused = true; sync(); });
  screen.addEventListener('focusout', () => { focused = false; sync(); });
  screen.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  screen.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') { hover = false; api?.setTilt(0, 0); sync(); }
  });
  screen.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !api) return;
    const r = screen.getBoundingClientRect();
    api.setTilt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  });
  let sx = null, sy = 0;
  screen.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    sx = e.clientX; sy = e.clientY; press = true; sync();
  });
  const up = (e) => {
    press = false;
    if (sx == null) { sync(); return; }
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (e.type === 'pointercancel') { sync(); return; }
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (Math.hypot(dx, dy) < 10) go(1);
    sync();
  };
  screen.addEventListener('pointerup', up);
  screen.addEventListener('pointercancel', up);

  // ---- closing: back to the garden ----------------------------------------------------
  const topLink = $('.wk-top');
  topLink.addEventListener('click', (e) => {
    const target = document.getElementById('top');
    e.preventDefault();
    const y = target ? target.getBoundingClientRect().top + scrollY : 0;
    scrollTo({ top: y, behavior: reduced.matches ? 'auto' : 'smooth' });
  });

  void ticking;
  return {
    destroy() {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
      show?.destroy();
      api?.destroy();
      section.classList.remove('wk-root', 'wk-armed');
      section.textContent = '';
    },
  };
}

const STYLE = `
.wk-root { --wk-paper: var(--paper, #f6f4ef); --wk-ink: var(--ink, #1f1d1b); --wk-ink2: var(--ink-2, rgba(31,29,27,.56)); --wk-line: rgba(31,29,27,.12);
  --wk-ease: cubic-bezier(.22,1,.36,1); --wk-spring: cubic-bezier(.3,1.4,.5,1);
  --wk-serif: "Instrument Sans", -apple-system, system-ui, sans-serif; --wk-mono: ${MONO};
  position: relative; color: var(--wk-ink); background: var(--wk-paper); -webkit-font-smoothing: antialiased;
  padding: clamp(112px, 20vh, 220px) clamp(16px, 4vw, 48px) calc(clamp(72px, 12vh, 140px) + env(safe-area-inset-bottom)); }
.wk-root *, .wk-root *::before, .wk-root *::after { box-sizing: border-box; }
.wk-col { max-width: 1040px; margin: 0 auto; }
:where(.wk-root) a { color: inherit; text-decoration: none; }
.wk-root :focus-visible { outline: 2px solid var(--wk-ink); outline-offset: 3px; border-radius: 4px; }
.wk-root button { all: unset; box-sizing: border-box; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.wk-root button:focus-visible { outline: 2px solid var(--wk-ink); outline-offset: 2px; }

/* scroll reveal: a soft blur-up (off under reduced motion) */
@media (prefers-reduced-motion: no-preference) {
  .wk-armed [data-wk-r] { opacity: 0; filter: blur(10px); transform: translateY(18px);
    transition: opacity 1s var(--wk-ease) var(--d, 0s), filter 1s var(--wk-ease) var(--d, 0s), transform 1.1s var(--wk-ease) var(--d, 0s); }
  .wk-armed [data-wk-r].is-in { opacity: 1; filter: none; transform: none; }
}

/* opener */
.wk-open { display: grid; gap: clamp(18px, 2.6vw, 28px); margin-bottom: clamp(88px, 15vw, 190px); }
.wk-label, .wk-idx { margin: 0; font: 400 11px/1 var(--wk-mono); letter-spacing: .04em; color: var(--wk-ink2); }
.wk-label { font: 500 15px/1 var(--pixel, ${MONO}); letter-spacing: .02em; color: var(--wk-ink); }
.wk-h2 { margin: 0; max-width: 13.5em; font: 500 clamp(34px, 5.2vw, 64px)/1.04 var(--wk-serif); letter-spacing: -.04em; text-wrap: balance; }
.wk-h2 em, .wk-hi em { font-style: normal; color: var(--wk-ink2); }

/* a project */
.wk-p + .wk-p { margin-top: clamp(112px, 17vw, 220px); }
.wk-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; column-gap: 16px; margin-bottom: clamp(32px, 4.4vw, 52px);
  grid-template-areas: "idx idx" "title link" "line line" "meta meta" "more more"; }
.wk-idx { grid-area: idx; margin-bottom: clamp(14px, 2vw, 22px); }
.wk-title { grid-area: title; margin: 0; align-self: last baseline; font: 500 clamp(52px, 8.6vw, 104px)/.95 var(--wk-serif); letter-spacing: -.05em; padding-bottom: .04em; }
.wk-line { grid-area: line; margin: clamp(22px, 3vw, 32px) 0 0; max-width: 31em; font: 400 clamp(16px, 1.55vw, 19px)/1.5 system-ui, -apple-system, "SF Pro Text", sans-serif; color: rgba(31,29,27,.72); text-wrap: pretty; }
.wk-meta { grid-area: meta; margin: clamp(16px, 2vw, 20px) 0 0; font: 400 11.5px/1.4 var(--wk-mono); letter-spacing: .01em; color: var(--wk-ink2); }
/* the live link sits on the title's baseline, a small pill */
.wk-link { grid-area: link; position: relative; align-self: last baseline; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px;
  border-radius: 99px; font: 400 11.5px/1 var(--wk-mono); color: var(--wk-ink); box-shadow: inset 0 0 0 1px var(--wk-line);
  transition: background .25s, box-shadow .25s, transform .16s var(--wk-ease); }
.wk-more { grid-area: more; margin: 18px 0 0; display: flex; flex-wrap: wrap; gap: 8px 20px; font: 400 12px/1.4 var(--wk-mono); }
.wk-more a { position: relative; color: var(--wk-ink); text-decoration: underline; text-decoration-color: rgba(31,29,27,.25); text-underline-offset: 4px; text-decoration-thickness: 1px; transition: text-decoration-color .2s; border-radius: 3px; }
.wk-more a::before { content: ""; position: absolute; inset: -14px -6px; }
.wk-more a span { display: inline-block; transition: transform .4s var(--wk-spring); }
.wk-more a:focus-visible { outline: 1.5px solid currentColor; outline-offset: 3px; }
@media (hover: hover) and (pointer: fine) { .wk-more a:hover { text-decoration-color: currentColor; } .wk-more a:hover span { transform: translate(2px, -2px); } }
.wk-link span:not(.wk-dom) { display: inline-block; transition: transform .4s var(--wk-spring); }
.wk-link::before { content: ""; position: absolute; inset: -6px -4px; }
.wk-link:active { transform: scale(.97); }
@media (hover: hover) and (pointer: fine) { .wk-link:hover { background: rgba(31,29,27,.04); box-shadow: inset 0 0 0 1px rgba(31,29,27,.24); } .wk-link:hover span:not(.wk-dom) { transform: translate(2px, -2px); } }

/* stages */
.wk-stage { position: relative; }
.wk-wc.is-pending { aspect-ratio: 4 / 3.3; }
.wk-screen { position: relative; aspect-ratio: 16 / 10; overflow: hidden; border-radius: clamp(18px, 2.6vw, 28px); background: linear-gradient(140deg, #f6c3cd, #bcd2f1); color: #fff; cursor: pointer;
  user-select: none; -webkit-user-select: none; touch-action: pan-y; outline: none; isolation: isolate; box-shadow: 0 0 0 .5px rgba(31,29,27,.1), 0 30px 60px -34px rgba(20,20,30,.4); }
.wk-screen:focus-visible { box-shadow: 0 0 0 2px var(--wk-ink), 0 0 0 5px var(--wk-paper); }
.wk-screen canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.wk-cap { position: absolute; left: clamp(20px, 3.4vw, 40px); right: clamp(20px, 3.4vw, 40px); bottom: clamp(18px, 3vw, 36px); display: grid; gap: 8px; pointer-events: none; text-shadow: 0 1px 18px rgba(0,0,0,.16); }
.wk-rt { font: 400 clamp(40px, 7.4vw, 88px)/1 "Faculty Glyphic", Georgia, serif; letter-spacing: -.015em; }
.wk-rs { font: 400 11px/1.2 var(--wk-mono); letter-spacing: .03em; opacity: .8; }
.wk-screen.light { color: var(--wk-ink); } .wk-screen.light .wk-cap { text-shadow: none; }
.wk-screen.swap .wk-cap { animation: wk-swap .7s var(--wk-ease) both; }
@keyframes wk-swap { from { opacity: 0; transform: translateY(10px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
.wk-ctl { display: flex; align-items: center; gap: clamp(14px, 2.4vw, 24px); padding-top: 18px; }
.wk-count { flex: none; font: 400 11.5px/1 var(--wk-mono); letter-spacing: .02em; color: var(--wk-ink2); font-variant-numeric: tabular-nums; }
.wk-bar { flex: 1; height: 1px; background: var(--wk-line); position: relative; overflow: hidden; }
.wk-bar i { position: absolute; inset: 0; background: var(--wk-ink); transform: scaleX(0); transform-origin: 0 50%; }
.wk-btns { display: flex; gap: 8px; flex: none; }
.wk-btns button { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--wk-line); transition: background .25s, box-shadow .25s, transform .4s var(--wk-spring); }
@media (hover: hover) and (pointer: fine) { .wk-btns button:hover { background: rgba(31,29,27,.045); box-shadow: inset 0 0 0 1px rgba(31,29,27,.26); } }
.wk-btns button:active { transform: scale(.96); }
.wk-btns svg { width: 15px; height: 15px; fill: none; stroke: var(--wk-ink); stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.wk-hint { margin: 14px 0 0; font: 400 11px/1.4 var(--wk-mono); letter-spacing: .01em; color: rgba(31,29,27,.4); }

/* closing */
.wk-end { margin-top: clamp(140px, 22vw, 280px); padding-top: clamp(48px, 7vw, 88px); border-top: 1px solid var(--wk-line); display: grid; justify-items: start; }
.wk-hi { margin: 0; font: 500 clamp(64px, 14vw, 176px)/.9 var(--wk-serif); letter-spacing: -.055em; }
.wk-mail { margin-top: clamp(26px, 3.4vw, 40px); font: 400 clamp(15px, 1.7vw, 19px)/1.3 system-ui, -apple-system, sans-serif; overflow-wrap: anywhere;
  background: linear-gradient(currentColor, currentColor) 0 100% / 100% 1px no-repeat; padding-bottom: 4px; transition: background-size .5s var(--wk-ease); }
@media (hover: hover) and (pointer: fine) { .wk-mail:hover { background-size: 0 1px; background-position: 100% 100%; } }
.wk-soc { display: flex; flex-wrap: wrap; gap: 8px 22px; margin: clamp(18px, 2.4vw, 26px) 0 0; font: 400 11.5px/1.3 var(--wk-mono); color: var(--wk-ink2); }
.wk-soc a { transition: color .25s; } .wk-soc a:hover, .wk-top:hover { color: var(--wk-ink); }
.wk-top { margin-top: clamp(64px, 10vw, 120px); font: 400 11.5px/1 var(--wk-mono); color: var(--wk-ink2); transition: color .25s; }
.wk-top span { display: inline-block; transition: transform .5s var(--wk-spring); }
@media (hover: hover) and (pointer: fine) { .wk-top:hover span { transform: translateY(-3px); } }

/* phones: one column, composed on its own */
@media (max-width: 640px) {
  .wk-root { padding-top: clamp(96px, 16vh, 140px); }
  .wk-title { font-size: clamp(46px, 14vw, 64px); }
  .wk-head { column-gap: 10px; }
  .wk-link { padding: 9px 12px; min-height: 44px; }
  .wk-link .wk-dom { display: none; }
  .wk-line { margin-top: 18px; }
  .wk-wc.is-pending { aspect-ratio: 1 / 1.3; }
  /* a landscape rectangle on phones too, so each shader reads whole instead of cropped */
  .wk-screen { aspect-ratio: 4 / 3; border-radius: 18px; }
  .wk-rt { font-size: clamp(28px, 8.6vw, 38px); }
  .wk-cap { left: 16px; right: 16px; bottom: 14px; gap: 5px; }
  .wk-btns button { width: 44px; height: 44px; }
  /* insets stay inside the gap between these links, so the later one can't take the email's clicks */
  .wk-mail, .wk-soc a, .wk-top { position: relative; }
  .wk-mail::before { content: ""; position: absolute; inset: -8px -4px; }
  .wk-soc a::before { content: ""; position: absolute; inset: -4px -8px; }
  .wk-top::before { content: ""; position: absolute; inset: -12px -8px; }
  .wk-end { margin-top: 120px; }
}
@media (prefers-reduced-motion: reduce) {
  .wk-root *, .wk-root *::before, .wk-root *::after { animation: none !important; transition-duration: .01s !important; }
  .wk-bar i { display: none; }
}
`;
