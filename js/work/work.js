// The projects section: lives on the home page, directly below the garden hero.
// mountWork(section) -> { destroy() }
// Fills <section id="projects"> with an opener, then three projects: WhyClub (five screens straight on the page, the
// same row its case study opens on), then two on one stage shape: Vayu (the phone app looping in a device, the watch
// beside it) and Font Preview (its Quick Look demo looping), and a quiet
// closing. Mochi (js/mochi.js) narrates from the corner; nothing here knows about her.
// Night mode sets data-theme="dark" on <html>; the section turns pitch black from the same tokens.
import { WHYCLUB, VAYU, FONTPREVIEW } from '../content.js';
import { endMarkup, wireEnd } from './end.js';

const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&display=swap';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const A = (n) => `/assets/work/whyclub/${n}`;
const V = (n) => `/assets/work/vayu/${n}`;
const F = (n) => `/assets/work/font-preview/${n}`;

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
  s.textContent = STYLE;
  document.head.appendChild(s);
}

const pic = (src, alt, w = 392, h = 848) =>
  `<picture><source type="image/avif" srcset="${src}.avif"><img src="${src}.webp" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async" draggable="false"></picture>`;
const clip = (src, alt, poster = src, w = '', h = '') =>
  `<video muted loop playsinline disablepictureinpicture preload="none" poster="${poster}.webp"${w ? ` width="${w}" height="${h}"` : ''} aria-label="${alt}"><source type="video/webm" src="${src}.webm"><source type="video/mp4" src="${src}.mp4"></video>`;

// whyclub: five screens in the order you'd shop, home a size up in the middle and playing, a name and a line under each
const LINEUP = [
  { media: pic(A('m-02'), 'The shop on a phone: a two-column grid of tees with prices.', 784, 1696), name: 'Shop', does: 'Two to a row. The + is quick add.' },
  { media: pic(A('m-04'), 'Quick add open over the shop: photos, the price, sizes and Add to bag.', 784, 1696), name: 'Quick add', does: 'Size and price, without leaving.' },
  { media: clip(A('p-hero'), 'The home page on a phone, swiping between drops.'), name: 'Home', does: 'One drop per screen. Swipe for the next.', main: true },
  { media: pic(A('m-03'), 'The product page on a phone for the Please, I’m a Star tee.', 784, 1696), name: 'Product', does: 'Details rise over the photo.' },
  { media: pic(A('m-cart'), 'The bag with one tee, a free socks offer and the order summary.', 784, 1696), name: 'Bag', does: 'Each piece on one line, then checkout.' },
];
// a bare screen in the case study's glass: the bezel is drawn as rings, so it never changes the screen's size.
// data-at pairs it with the same screen in the case study's opening, so the page transition can carry it across
const screen = (media, at, pt) => `<div class="wk-scr" data-at="${at}"><div class="wk-glass"${pt ? ` data-pt-src="${pt}"` : ''}>${media}</div></div>`;
const arrow = '<span aria-hidden="true">→</span>';
const out = '<span aria-hidden="true">↗</span>';
// a site's own favicon, for the outside links
const ico = (n) => `<img src="/assets/brand/sites/${n}.png" alt="" width="16" height="16" decoding="async">`;
// the github mark, for the open-source link
const GH = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

export function mountWork(section) {
  injectCSS();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // the page lists its published case studies in data-cases; a draft gets no link, so nothing here can 404
  const cases = section.dataset.cases?.split(' ') ?? [];
  const read = (id, label) => (cases.includes(id) ? `<a class="wk-read" href="/projects/${id}/">${label} ${arrow}</a>` : '');

  section.classList.add('wk-root');
  section.innerHTML = `
    <div class="wk-col">
      <div class="wk-open">
        <p class="wk-label" data-wk-r>projects</p>
        <h2 class="wk-h2" data-wk-r style="--d:.08s">Things I designed, <em>then built.</em></h2>
      </div>

      <article class="wk-p" id="work-whyclub">
        <header class="wk-head">
          <span class="wk-idx" data-wk-r>01 / 03 · live store</span>
          <h3 class="wk-title" data-wk-r style="--d:.05s">WhyClub</h3>
          <p class="wk-line" data-wk-r style="--d:.1s">A streetwear label from India that sells oversized graphic tees in small drops. The name came from its founder. Everything else is mine: the design, the graphics, the store and the backend.</p>
          <p class="wk-acts" data-wk-r style="--d:.15s">
            ${read('whyclub', 'Read the case study')}
            <a class="wk-link wk-gh" href="${WHYCLUB.href}" target="_blank" rel="noopener">${ico('whyclub')}WhyClub ${out}</a>
          </p>
        </header>
        <div class="wk-fig" data-wk-r style="--d:.2s">
          <div class="wk-st-why">
            <ol class="wk-lineup" aria-label="Five screens from the store" data-pt-lineup="whyclub">
              ${LINEUP.map((p, i) => `<li${p.main ? ' class="is-main"' : ''}>${screen(p.media, i, p.main && 'whyclub')}<p class="wk-cap"><span data-pt-nm="${i}">${p.name}</span>${p.does}</p></li>`).join('')}
            </ol>
          </div>
        </div>
      </article>

      <article class="wk-p" id="work-vayu">
        <header class="wk-head">
          <span class="wk-idx" data-wk-r>02 / 03 · concept, FigBuild 2026</span>
          <h3 class="wk-title" data-wk-r style="--d:.05s">Vayu <span class="wk-hi-dev" lang="hi">वायु</span></h3>
          <p class="wk-line" data-wk-r style="--d:.1s">A watch that taps your wrist when the air around you turns bad, and hands you a cleaner way through in the same moment. Like Apple Watch’s noise alerts, but for the air. Designed with Shardul N.</p>
          <p class="wk-acts" data-wk-r style="--d:.15s">
            ${read('vayu', 'See the concept')}
            <a class="wk-link wk-gh" href="${VAYU.href}" target="_blank" rel="noopener">${ico('devpost')}Devpost ${out}</a>
          </p>
        </header>
        <figure class="wk-fig" data-wk-r style="--d:.2s">
          <div class="wk-stage wk-st-vy" data-pt-src="vayu">
            <div class="wk-pair">
              <div class="wk-ph">
                <div class="wk-ph-screen">${clip(V('vy-app'), 'The Vayu phone app, cycling through Summary with an air comfort score and AQI, Routes with two walks coloured by air, and Trends with the day’s AQI.', V('vy-app-poster'), 720, 1566)}</div>
                <i class="wk-ph-isl" aria-hidden="true"></i>
              </div>
              <div class="wk-wt">
                <div class="wk-wt-screen">${clip(V('vy-watch'), 'The Vayu watch, moving between Vitals, Air and Routes.', V('vy-watch-poster'), 416, 508)}</div>
              </div>
            </div>
          </div>
          <figcaption class="wk-cap"><span>Not the shortest route. The one with the cleanest air.</span>The phone app and the watch I redesigned after the film we made for FigBuild.</figcaption>
        </figure>
      </article>

      <article class="wk-p" id="work-fontpreview">
        <header class="wk-head">
          <span class="wk-idx" data-wk-r>03 / 03 · macOS app, open source</span>
          <h3 class="wk-title" data-wk-r style="--d:.05s">Font Preview</h3>
          <p class="wk-line" data-wk-r style="--d:.1s">Quick Look for fonts on macOS. Select a font file in Finder, press Space, and see the whole font without installing it, WOFF2 included. I kept running into this myself, so I built it.</p>
          <p class="wk-acts" data-wk-r style="--d:.15s">
            ${read('font-preview', 'Try it here')}
            <a class="wk-link wk-gh" href="${FONTPREVIEW.href}" target="_blank" rel="noopener">${GH}GitHub ${out}</a>
          </p>
        </header>
        <figure class="wk-fig" data-wk-r style="--d:.2s">
          <div class="wk-stage wk-st-fp" data-pt-src="font-preview">${clip(F('fp-demo'), 'Font Preview running: a Finder window, a font selected, Space opening Quick Look on its sizes and glyphs, then dark mode and the next fonts.', F('fp-demo-poster'), 1440, 900)}</div>
          <figcaption class="wk-cap"><span>Press Space on a font file.</span>The family set in itself, every size, then every glyph. Day or night, from a switch in the corner.</figcaption>
        </figure>
      </article>

${endMarkup()}
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

  // ---- reveal on scroll ---------------------------------------------------------------
  if (!reduced.matches) {
    section.classList.add('wk-armed');
    section.querySelectorAll('[data-wk-r]').forEach((el) => {
      observe(el, (on, io) => { if (on) { el.classList.add('is-in'); io?.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    });
  }

  // ---- the clips play while on screen, posters only under reduced motion ----------------
  section.querySelectorAll('video').forEach((v) => {
    observe(v, (on) => {
      if (dead) return;
      if (on && !reduced.matches && !document.hidden) {
        v.preload = 'auto';
        v.play()?.catch?.(() => {});
      } else v.pause();
    }, { threshold: 0.35 });
  });

  // ---- closing: the footer (js/work/end.js) copies the email, goes back to the garden, grows its bed ------
  cleanups.push(wireEnd(section.querySelector('.wk-end'), reduced));

  return {
    destroy() {
      if (dead) return;
      dead = true;
      section.querySelectorAll('video').forEach((v) => v.pause());
      cleanups.forEach((fn) => fn());
      section.classList.remove('wk-root', 'wk-armed');
      section.textContent = '';
    },
  };
}

const STYLE = `
/* every colour comes from these tokens, so night mode only has to swap them */
.wk-root { --wk-paper: #fff; --wk-ink: #1f1d1b; --wk-ink2: rgba(31,29,27,.68); --wk-text: rgba(31,29,27,.72); --wk-line: rgba(31,29,27,.12);
  --wk-line2: rgba(31,29,27,.24); --wk-wash: rgba(31,29,27,.04); --wk-cta: #1f1d1b; --wk-cta-ink: #fff; --wk-cta-hover: #000;
  --wk-bezel: #141414; --wk-bezel-edge: #3b3b3b; --wk-shadow: rgba(0,0,0,.45);
  --wk-stage: #fff; --wk-rad: clamp(18px, 2.2vw, 28px); --wk-tint-a: rgba(0,163,154,.13); --wk-tint-b: rgba(227,25,126,.09); --wk-sona: rgba(201,151,28,.34);
  --wk-ease: cubic-bezier(.22,1,.36,1); --wk-spring: cubic-bezier(.3,1.4,.5,1);
  --wk-serif: "Instrument Sans", -apple-system, system-ui, sans-serif; --wk-mono: ${MONO};
  position: relative; color: var(--wk-ink); background: var(--wk-paper); -webkit-font-smoothing: antialiased;
  padding: clamp(80px, 14vh, 140px) clamp(16px, 4vw, 48px) calc(clamp(56px, 9vh, 96px) + env(safe-area-inset-bottom));
  transition: background-color .6s var(--wk-ease), color .6s var(--wk-ease); }
/* pitch black, not navy: neutral greys only, the bezels lift off the page with a hairline instead of a shadow */
:root[data-theme="dark"] .wk-root { --wk-paper: #000; --wk-ink: #f2f2f0; --wk-ink2: rgba(242,242,240,.6); --wk-text: rgba(242,242,240,.72); --wk-line: rgba(255,255,255,.12);
  --wk-line2: rgba(255,255,255,.28); --wk-wash: rgba(255,255,255,.06); --wk-cta: #f2f2f0; --wk-cta-ink: #000; --wk-cta-hover: #fff;
  --wk-bezel: #1c1c1e; --wk-bezel-edge: #48484a; --wk-shadow: rgba(0,0,0,0);
  --wk-stage: #0b0b0c; --wk-tint-a: rgba(0,163,154,.2); --wk-tint-b: rgba(227,25,126,.15); --wk-sona: rgba(201,151,28,.4); color-scheme: dark; }
.wk-root *, .wk-root *::before, .wk-root *::after { box-sizing: border-box; }
.wk-col { max-width: 880px; margin: 0 auto; }
:where(.wk-root) a { color: inherit; text-decoration: none; }
.wk-root :focus-visible { outline: 2px solid var(--wk-ink); outline-offset: 3px; border-radius: 4px; }
.wk-root ::selection { background: var(--wk-ink); color: var(--wk-paper); }

/* scroll reveal: the text rises and fades in first, then the stage (off under reduced motion) */
@media (prefers-reduced-motion: no-preference) {
  .wk-armed [data-wk-r] { opacity: 0; transform: translateY(22px);
    transition: opacity .9s var(--wk-ease) var(--d, 0s), transform 1s var(--wk-ease) var(--d, 0s); }
  .wk-armed [data-wk-r].is-in { opacity: 1; transform: none; }
}

/* opener */
.wk-open { display: grid; gap: 14px; margin-bottom: clamp(64px, 9vw, 112px); }
.wk-label, .wk-idx { margin: 0; font: 400 11px/1 var(--wk-mono); letter-spacing: .04em; color: var(--wk-ink2); }
.wk-label { font: 500 15px/1 var(--pixel, ${MONO}); letter-spacing: .02em; color: var(--wk-ink); }
.wk-h2 { margin: 0; max-width: 16em; font: 500 clamp(28px, 3.2vw, 40px)/1.1 var(--wk-serif); letter-spacing: -.035em; text-wrap: balance; }
.wk-h2 em, .wk-hi em { font-style: normal; color: var(--wk-ink2); }

/* a project: index, title, one line and its links, centred over its stage */
.wk-p + .wk-p { margin-top: clamp(96px, 12vw, 152px); }
.wk-head { display: grid; justify-items: center; text-align: center; max-width: 560px; margin: 0 auto; }
.wk-idx { margin-bottom: 12px; }
.wk-title { margin: 0; font: 500 clamp(30px, 3.4vw, 40px)/1 var(--wk-serif); letter-spacing: -.035em; padding-bottom: .04em; }
.wk-hi-dev { font: 400 .42em/1 "Tiro Devanagari Hindi", "Kohinoor Devanagari", serif; letter-spacing: 0; color: var(--wk-ink2); vertical-align: .9em; margin-left: .1em; }
.wk-line { margin: 12px 0 0; max-width: 34em; font: 400 15px/1.5 system-ui, -apple-system, "SF Pro Text", sans-serif; color: var(--wk-text); text-wrap: balance; }
.wk-acts { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 14px; margin: 18px 0 0; }
/* the outside link: a quiet pill */
.wk-link { position: relative; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px;
  border-radius: 99px; font: 400 11.5px/1 var(--wk-mono); color: var(--wk-ink); box-shadow: inset 0 0 0 1px var(--wk-line);
  transition: background-color .25s, box-shadow .25s, transform .16s var(--wk-ease); }
.wk-gh { gap: 8px; padding-left: 14px; font-size: 12px; }
.wk-gh svg, .wk-gh img { flex: none; }
/* beats the full-bleed media rule on root img, which stretched the favicons */
.wk-root .wk-gh img { width: 16px; height: 16px; border-radius: 4px; object-fit: contain; }
.wk-link span { display: inline-block; transition: transform .4s var(--wk-spring); }
.wk-link:active { transform: scale(.97); }
@media (hover: hover) and (pointer: fine) { .wk-link:hover { background: var(--wk-wash); box-shadow: inset 0 0 0 1px var(--wk-line2); } .wk-link:hover span { transform: translate(2px, -2px); } }
/* the page on this site: the filled pill */
.wk-read { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 20px; border-radius: 99px; background: var(--wk-cta); color: var(--wk-cta-ink);
  font: 500 14px/1 system-ui, -apple-system, sans-serif; transition: transform .16s var(--wk-ease), background-color .25s; }
.wk-read span { display: inline-block; transition: transform .4s var(--wk-spring); }
.wk-read:active { transform: scale(.97); }
@media (hover: hover) and (pointer: fine) { .wk-read:hover { background: var(--wk-cta-hover); } .wk-read:hover span { transform: translateX(3px); } }

.wk-root img, .wk-root video { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; -webkit-user-drag: none; user-select: none; }
.wk-root picture { display: contents; }

/* the stage every project sits on: one shape and radius, a hairline ring, a soft lift on hover */
.wk-fig { margin: clamp(32px, 4.5vw, 56px) 0 0; }
.wk-stage { position: relative; overflow: hidden; display: grid; place-items: center; aspect-ratio: 16 / 10; container-type: inline-size;
  border-radius: var(--wk-rad); background: var(--wk-stage);
  box-shadow: 0 0 0 1px var(--wk-line), 0 28px 56px -38px var(--wk-shadow);
  transition: transform .6s var(--wk-ease), box-shadow .6s var(--wk-ease); }
@media (hover: hover) and (pointer: fine) {
  .wk-stage:hover { transform: translateY(-3px); box-shadow: 0 0 0 1px var(--wk-line2), 0 40px 64px -36px var(--wk-shadow); }
  .wk-stage video { transition: filter .6s var(--wk-ease); }
  .wk-stage:hover video { filter: brightness(1.035) saturate(1.04); }
}
.wk-fig .wk-cap { margin-top: clamp(18px, 2.4vw, 24px); }
.wk-cap { margin: 16px 0 0; font: 400 12px/1.45 var(--wk-serif); color: var(--wk-ink2); text-align: center; text-wrap: balance; }
.wk-cap span { display: block; margin-bottom: 2px; font-weight: 500; font-size: 12.5px; color: var(--wk-ink); }

/* whyclub: the case study's opening in miniature, five screens with home a size up in the middle, straight on the page:
   no stage, no ring, so the same phones can carry on into the case study when it opens */
.wk-st-why { container-type: inline-size; }
.wk-lineup { list-style: none; margin: 0; padding: clamp(8px, 1.5vw, 16px) 0 0; display: flex; justify-content: center; align-items: center; gap: 1.8cqw; }
.wk-lineup li { width: 14.5cqw; flex: none; }
.wk-lineup li.is-main { width: 17.5cqw; }
/* a name is only as wide as its word, like the case study's, so the page transition carries it across unstretched */
.wk-lineup .wk-cap span { width: fit-content; margin-inline: auto; }
.wk-scr { container-type: inline-size; }
.wk-glass { position: relative; aspect-ratio: 392 / 848; border-radius: 12.5cqw; overflow: hidden; background: #fff;
  box-shadow: 0 0 0 2.6cqw var(--wk-bezel), 0 0 0 calc(2.6cqw + 1px) var(--wk-bezel-edge), 0 30px 50px -28px var(--wk-shadow); }

/* vayu: the phone app looping in a device, the watch standing beside it, on a mor and rani wash edged with sona */
.wk-st-vy { background: radial-gradient(75% 90% at 12% 0%, var(--wk-tint-a), transparent 65%), radial-gradient(70% 85% at 100% 100%, var(--wk-tint-b), transparent 65%), var(--wk-stage);
  box-shadow: 0 0 0 1px var(--wk-sona), 0 28px 56px -38px var(--wk-shadow); }
@media (hover: hover) and (pointer: fine) { .wk-st-vy:hover { box-shadow: 0 0 0 1px var(--wk-sona), 0 40px 64px -36px var(--wk-shadow); } }
.wk-pair { --ph: 23cqw; position: relative; width: var(--ph); translate: calc(var(--ph) * -.2) 0; }
.wk-ph { position: relative; aspect-ratio: 402 / 874; border-radius: calc(var(--ph) * .15); background: #000;
  box-shadow: 0 0 0 calc(var(--ph) * .035) var(--wk-bezel), 0 0 0 calc(var(--ph) * .035 + 1px) var(--wk-bezel-edge), 0 40px 60px -30px var(--wk-shadow); }
.wk-ph-screen { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; background: #f6f3fa; }
.wk-ph-isl { position: absolute; top: calc(var(--ph) * .03); left: 50%; width: calc(var(--ph) * .27); height: calc(var(--ph) * .08); translate: -50% 0; border-radius: 99px; background: #000; }
.wk-wt { --wt: calc(var(--ph) * .52); position: absolute; width: var(--wt); left: calc(100% - var(--ph) * .1); bottom: calc(var(--ph) * .14); }
.wk-wt-screen { aspect-ratio: 416 / 508; border-radius: calc(var(--wt) * .17); overflow: hidden; background: #f6f3fa; position: relative;
  box-shadow: 0 0 0 calc(var(--wt) * .045) var(--wk-bezel), 0 0 0 calc(var(--wt) * .045 + 1px) var(--wk-bezel-edge), 0 24px 40px -16px var(--wk-shadow); }
.wk-wt::after { content: ""; position: absolute; right: calc(var(--wt) * -.085); top: 24%; width: calc(var(--wt) * .045); height: 17%; border-radius: 0 3px 3px 0; background: var(--wk-bezel-edge); }

/* font preview: the demo fills the stage; its desktop carries its own colour */
.wk-st-fp video { position: absolute; inset: 0; }

/* phones: one column, composed on its own */
@media (max-width: 640px) {
  .wk-root { padding-top: clamp(72px, 12vh, 104px); }
  .wk-title { font-size: clamp(28px, 8.5vw, 34px); }
  .wk-line { margin-top: 18px; }
  .wk-fig { margin-top: 28px; }
  .wk-stage { aspect-ratio: auto; }
  /* exactly the case study's opening row on a phone (its tiny row in Opening.astro): all five across the column, home
     in the middle and the rest .8 of it, 8px apart, product and bag on its left, shop and quick add on its right,
     every name on one line under home. same sizes, so the page transition only has to slide them */
  .wk-st-why { --hw: calc((100cqw - 32px) / 4.2); }
  .wk-lineup { gap: 8px; padding: 0 0 40px; }
  .wk-lineup li { position: relative; width: calc(var(--hw) * .8); }
  .wk-lineup li.is-main { width: var(--hw); }
  .wk-lineup li:nth-child(1) { order: 4; } .wk-lineup li:nth-child(2) { order: 5; } .wk-lineup li:nth-child(3) { order: 3; }
  .wk-lineup li:nth-child(4) { order: 1; } .wk-lineup li:nth-child(5) { order: 2; }
  .wk-lineup .wk-cap { position: absolute; left: 50%; top: calc(50% + var(--hw) * 424 / 392 + 19px); translate: -50% 0; margin: 0; font-size: 0; white-space: nowrap; }
  .wk-lineup .wk-cap span { margin: 0; font: 500 12px/1 var(--wk-serif); color: var(--wk-ink2); }
  .wk-cap { font-size: 11px; } .wk-cap span { font-size: 12px; }
  .wk-st-vy { padding: 26px 0; }
  .wk-pair { --ph: 46cqw; }
  .wk-st-fp { aspect-ratio: 16 / 10; }
}
@media (prefers-reduced-motion: reduce) {
  .wk-root *, .wk-root *::before, .wk-root *::after { animation: none !important; transition-duration: .01s !important; }
}
`;
