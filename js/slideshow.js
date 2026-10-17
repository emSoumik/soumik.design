// WhyClub screen slideshow: an iOS Stories viewer married to a Safari window.
// mountSlideshow(host, { device: 'desktop' | 'phone' | 'auto', interval, phoneManifest }) -> { setDevice(d), destroy() }
//
// Items (paths relative to assets/wc/, or absolute URLs):
//   image: { type?: 'image', src, webp?, label, alt, tint, path? }
//   video: { type: 'video', src (mp4), webm?, poster?, posterWebp?, duration?, label, alt, tint, path? }
// The phone set is fetched lazily from assets/wc/phone.json (or opts.phoneManifest); SCREENS.phone is the fallback.

const ASSET_BASE = new URL('../assets/wc/', import.meta.url);
const asset = n => new URL(n, ASSET_BASE).href;

// tint: two colours sampled from each screenshot (hand-picked from its palette), used by the stage backdrop.
export const SCREENS = {
  desktop: [
    { src: asset('d-01.avif'), alt: 'WhyClub home page: a full-bleed campaign hero with the new drop', label: 'Home', path: '', tint: ['#7f9bc9', '#b9c9e6'] },
    { src: asset('d-02.avif'), alt: 'WhyClub shop page: a clean grid of tees with prices', label: 'Shop', path: '/shop', tint: ['#a88f82', '#ddd3c9'] },
    { src: asset('d-03.avif'), alt: 'WhyClub product page for the Please, I’m a Star tee', label: 'Product', path: '/products/please-im-a-star', tint: ['#7a70c4', '#b392c0'] },
    { src: asset('d-05.avif'), alt: 'WhyClub 404 page: a prism splitting light through a 4-triangle-4', label: '404', path: '/nope', tint: ['#5b8c68', '#7a5ea8'] },
  ],
  phone: [
    { src: asset('m-01.avif'), alt: 'WhyClub home on a phone: the campaign hero with the new drop', label: 'Home', path: '', tint: ['#7f9bc9', '#c9d8f0'] },
    { src: asset('m-02.avif'), alt: 'WhyClub shop on a phone: a two-column grid of tees', label: 'Shop', path: '/shop', tint: ['#a88f82', '#ddd3c9'] },
    { src: asset('m-03.avif'), alt: 'WhyClub product page on a phone with the Please, I’m a Star tee', label: 'Product', path: '/products/please-im-a-star', tint: ['#7a70c4', '#b392c0'] },
    { src: asset('m-05.avif'), alt: 'WhyClub 404 on a phone: a prism splitting light', label: '404', path: '/nope', tint: ['#5b8c68', '#7a5ea8'] },
  ],
};

const DEVICES = ['phone', 'desktop'];   // phone first, in the switch and by default
const NEUTRAL_TINT = ['#c9c5bc', '#e4e0d6'];

// one shape for everything the renderer touches; every URL absolute
function normalize(it) {
  if (!it || typeof it !== 'object' || typeof it.src !== 'string') return null;
  const video = it.type === 'video';
  const o = {
    type: video ? 'video' : 'image',
    src: asset(it.src),
    label: String(it.label ?? ''),
    alt: String(it.alt ?? it.label ?? ''),
    path: it.path || '',
    tint: Array.isArray(it.tint) && it.tint.length >= 2 ? it.tint : NEUTRAL_TINT,
  };
  if (video) {
    o.webm = it.webm ? asset(it.webm) : '';
    o.poster = it.poster ? asset(it.poster) : '';
    o.posterWebp = it.posterWebp ? asset(it.posterWebp) : '';
    o.duration = Number(it.duration) > 0 ? Number(it.duration) : 0;
  } else {
    o.webp = it.webp ? asset(it.webp) : /\.avif$/.test(o.src) ? o.src.replace(/\.avif$/, '.webp') : '';
  }
  return o;
}

// phone manifest: fetched once per URL, shared across mounts; null means "use the fallback"
const manifests = new Map();
function loadManifest(url) {
  if (!manifests.has(url)) {
    manifests.set(url, (async () => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 4000);
      try {
        const r = await fetch(url, { signal: ctl.signal });
        if (!r.ok) return null;
        const j = await r.json();
        if (!Array.isArray(j)) return null;
        const items = j.map(normalize).filter(Boolean);
        return items.length ? items : null;
      } catch { return null; } finally { clearTimeout(t); }
    })());
  }
  return manifests.get(url);
}
const EASE = 'cubic-bezier(.22,1,.36,1)';

export const SLIDESHOW_CSS = `
.wcs{container-type:inline-size;display:block;width:100%;position:relative;color:#16140f;-webkit-tap-highlight-color:transparent;font:13px/1.2 system-ui,-apple-system,"SF Pro Text",sans-serif;-webkit-font-smoothing:antialiased}
.wcs *{box-sizing:border-box}
.wcs .wcs-bars{display:flex;gap:3px;margin:0 0 2px;min-height:14px}
.wcs .wcs-bar{all:unset;box-sizing:border-box;flex:1;height:14px;display:flex;align-items:center;cursor:pointer;touch-action:manipulation}
.wcs .wcs-bar:focus-visible{outline:2px solid #16140f;outline-offset:-2px;border-radius:4px}
.wcs .wcs-bar i{display:block;width:100%;height:3px;border-radius:3px;background:rgba(22,20,15,.12);overflow:hidden;position:relative}
.wcs .wcs-bar b{position:absolute;inset:0;border-radius:3px;background:rgba(22,20,15,.82);transform:scaleX(0);transform-origin:left}
.wcs-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;min-height:28px}
.wcs-label{display:flex;align-items:baseline;gap:8px;min-width:0;font-weight:600;font-size:clamp(13px,3.2cqw,16px);letter-spacing:-.01em;white-space:nowrap}
.wcs-label span{display:inline-block}
.wcs-count{font:500 clamp(10px,2.4cqw,11px)/1 ui-monospace,"SF Mono",Menlo,monospace;color:rgba(22,20,15,.42);letter-spacing:.02em;font-variant-numeric:tabular-nums}
.wcs-seg{position:relative;display:inline-grid;grid-template-columns:1fr 1fr;padding:2px;border-radius:999px;background:rgba(22,20,15,.06);box-shadow:inset 0 0 0 .5px rgba(22,20,15,.06);flex:none}
.wcs-seg::before{content:"";position:absolute;top:2px;bottom:2px;left:2px;width:calc(50% - 2px);border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(22,20,15,.14),0 0 0 .5px rgba(22,20,15,.06);transform:translateX(calc(var(--i,0) * 100%));transition:transform .5s ${EASE}}
.wcs .wcs-seg button{all:unset;box-sizing:border-box;position:relative;z-index:1;padding:5px 12px;border-radius:999px;font-size:11.5px;font-weight:600;letter-spacing:-.005em;text-align:center;color:rgba(22,20,15,.5);cursor:pointer;transition:color .3s;touch-action:manipulation}
.wcs .wcs-seg button[aria-pressed=true]{color:#16140f}
.wcs .wcs-seg button:focus-visible{outline:2px solid #16140f;outline-offset:1px}
.wcs-stage{position:relative;display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr);aspect-ratio:4/3.05;overflow:hidden;border-radius:clamp(16px,5cqw,28px);background:#f6f4ef;box-shadow:inset 0 0 0 .5px rgba(22,20,15,.08);user-select:none;-webkit-user-select:none;touch-action:pan-y pinch-zoom;cursor:pointer;outline:none;isolation:isolate}
.wcs-stage:focus-visible{box-shadow:inset 0 0 0 2px #16140f}
.wcs-bg{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.wcs-bg i{position:absolute;inset:0;opacity:0;transition:opacity .6s ease;background:radial-gradient(85% 75% at 14% 6%,color-mix(in srgb,var(--t1) 40%,transparent),transparent 66%),radial-gradient(80% 70% at 90% 98%,color-mix(in srgb,var(--t2) 46%,transparent),transparent 64%),radial-gradient(60% 50% at 78% 18%,color-mix(in srgb,var(--t2) 18%,transparent),transparent 70%)}
.wcs-bg i.is-on{opacity:1}
.wcs-bg::after{content:"";position:absolute;inset:0;opacity:.09;mix-blend-mode:multiply;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .1 0 0 0 0 .09 0 0 0 0 .06 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}
.wcs-dev{position:relative;z-index:1;grid-area:1/1;justify-self:center;opacity:0;pointer-events:none;transition:opacity .45s ease,transform .8s ${EASE};will-change:transform,opacity}
.wcs-stage[data-device=desktop] .wcs-win,.wcs-stage[data-device=phone] .wcs-phone{opacity:1;transform:none}
.wcs-win{align-self:center;width:90cqw;transform:translateY(5%) scale(.94)}
.wcs-body{border-radius:clamp(8px,2.2cqw,13px);background:#fff;overflow:hidden;box-shadow:0 0 0 .5px rgba(22,20,15,.16),0 1px 1px rgba(22,20,15,.08),0 6px 14px -4px rgba(40,30,15,.14),0 28px 52px -18px rgba(40,30,15,.34)}
.wcs-win::after,.wcs-phone::after{content:"";position:absolute;z-index:-1;left:7%;right:7%;bottom:-2.2cqw;height:4.4cqw;border-radius:50%;background:radial-gradient(closest-side,rgba(40,30,15,.42),rgba(40,30,15,.14) 62%,transparent);filter:blur(5px);pointer-events:none}
.wcs-phone::after{left:10%;right:10%;bottom:-2.6cqw}
.wcs-chrome{height:clamp(19px,4.4cqw,30px);display:grid;grid-template-columns:1fr minmax(0,44%) 1fr;align-items:center;padding:0 clamp(6px,1.6cqw,12px);background:linear-gradient(#f8f7f5,#efeeea);border-bottom:.5px solid rgba(22,20,15,.1)}
.wcs-dots{display:flex;gap:clamp(3px,.8cqw,6px)}
.wcs-dots i{width:clamp(4px,1cqw,7px);aspect-ratio:1;border-radius:50%;background:#d3d0ca;box-shadow:inset 0 0 0 .5px rgba(22,20,15,.12)}
.wcs-url{height:62%;display:flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(22,20,15,.055);font-size:clamp(7.5px,1.75cqw,11.5px);letter-spacing:-.005em;white-space:nowrap;overflow:hidden;color:rgba(22,20,15,.86);font-weight:500}
.wcs-url u{text-decoration:none;color:rgba(22,20,15,.4);font-weight:400;display:inline-block;overflow:hidden;text-overflow:ellipsis;max-width:0;transition:max-width .5s ${EASE}}
.wcs-url u.on{max-width:16em}
.wcs-url svg{width:.8em;height:.8em;margin-right:.45em;opacity:.45;flex:none}
.wcs-screen{position:relative;overflow:hidden;background:#f0eeea}
.wcs-win .wcs-screen{aspect-ratio:1200/752}
.wcs-stage[data-device=phone]{aspect-ratio:1/.86}
.wcs-phone{align-self:start;margin-top:4cqw;width:34cqw;padding:.9cqw;border-radius:6.6cqw;background:#17171a;transform:translateY(8%) scale(.94);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.22),0 0 0 .5px rgba(22,20,15,.5),0 8px 16px -6px rgba(40,30,15,.22),0 34px 60px -20px rgba(40,30,15,.5)}
.wcs-phone .wcs-screen{aspect-ratio:392/848;border-radius:5.8cqw}
.wcs-phone .wcs-screen::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(115deg,rgba(255,255,255,.1),rgba(255,255,255,0) 32%);z-index:5}
@container (max-width:520px){.wcs-stage[data-device=phone]{aspect-ratio:1/1.1}.wcs-phone{width:44cqw;margin-top:5cqw;padding:1.2cqw;border-radius:9cqw}.wcs-phone .wcs-screen{border-radius:7.8cqw}}
.wcs-shot{position:absolute;inset:0;margin:0;opacity:0;transform:scale(1.03);transition:opacity .6s ease,transform 1.1s ${EASE};will-change:opacity,transform}
.wcs-shot img,.wcs-shot video{display:block;width:100%;height:100%;object-fit:cover;object-position:top;pointer-events:none;-webkit-user-drag:none}
.wcs-shot.is-on{opacity:1;transform:none;z-index:2}
.wcs-shot.is-prev{opacity:0;transform:none;z-index:1}
.wcs .wcs-arrow{all:unset;box-sizing:border-box;position:absolute;top:50%;z-index:4;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;touch-action:manipulation;background:rgba(255,255,255,.78);backdrop-filter:blur(12px) saturate(1.4);-webkit-backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 .5px rgba(22,20,15,.12),0 2px 8px rgba(22,20,15,.14),0 1px 2px rgba(22,20,15,.1);opacity:0;pointer-events:none;transform:translateY(-50%);transition:opacity .3s,transform 160ms ease-out}
.wcs .wcs-arrow svg{width:16px;height:16px}
.wcs .wcs-arrow.l{left:12px}
.wcs .wcs-arrow.r{right:12px}
.wcs .wcs-arrow:active{transform:translateY(-50%) scale(.96)}
.wcs .wcs-arrow:focus-visible{outline:2px solid #16140f;outline-offset:2px;opacity:1;pointer-events:auto}
.wcs .wcs-stage:hover .wcs-arrow{opacity:1;pointer-events:auto}
@media (hover:none){.wcs .wcs-arrow{opacity:1;pointer-events:auto}}
@container (max-width:520px){.wcs .wcs-arrow{opacity:1;pointer-events:auto}}
.wcs[data-reduced] .wcs-shot,.wcs[data-reduced] .wcs-dev,.wcs[data-reduced] .wcs-bg i{transition-duration:.01s}
@media (prefers-reduced-motion:reduce){.wcs-seg::before,.wcs-url u,.wcs-arrow{transition-duration:.01s}}
`;

let cssDone = false;
function injectCSS() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'wcs-css';
  s.textContent = SLIDESHOW_CSS;
  document.head.appendChild(s);
}

const chev = d => `<svg viewBox="0 0 16 16" fill="none" stroke="#16140f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const LOCK = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.5a3.2 3.2 0 0 0-3.2 3.2V7H4a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.8V4.7A3.2 3.2 0 0 0 8 1.5Zm-1.8 3.2a1.8 1.8 0 1 1 3.6 0V7H6.2V4.7Z"/></svg>';

export function mountSlideshow(host, { device = 'desktop', interval = 2800, phoneManifest } = {}) {
  const manifestUrl = phoneManifest ? new URL(phoneManifest, document.baseURI).href : asset('phone.json');
  const lists = { desktop: SCREENS.desktop.map(normalize).filter(Boolean), phone: SCREENS.phone.map(normalize).filter(Boolean) };
  let phoneLoaded = false;
  const auto = device === 'auto';
  if (auto) device = 'phone';
  injectCSS();
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mq.matches;
  let dev = DEVICES.includes(device) ? device : 'phone';
  let idx = 0;
  let p = 0;
  let raf = 0;
  let last = 0;
  let inView = true;
  let hover = false;
  let press = false;
  let loading = false;
  let dead = false;
  let swapToken = 0;
  const layers = { desktop: [], phone: [] };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

  const root = document.createElement('div');
  root.className = 'wcs';
  root.innerHTML = `
    <div class="wcs-bars" role="group" aria-label="Screens"></div>
    <div class="wcs-meta">
      <div class="wcs-label" aria-live="polite"><span class="wcs-name"></span><span class="wcs-count"></span></div>
      <div class="wcs-seg" role="group" aria-label="Device">
        <button type="button" data-d="phone" aria-pressed="false">Phone</button>
        <button type="button" data-d="desktop" aria-pressed="false">Desktop</button>
      </div>
    </div>
    <div class="wcs-stage" tabindex="0" role="group" aria-roledescription="slideshow" aria-label="WhyClub screens. Use left and right arrow keys to browse.">
      <div class="wcs-bg" aria-hidden="true"><i></i><i></i></div>
      <div class="wcs-dev wcs-win"><div class="wcs-body">
        <div class="wcs-chrome"><div class="wcs-dots"><i></i><i></i><i></i></div><div class="wcs-url">${LOCK}<span>whyclub.in</span><u></u></div><span></span></div>
        <div class="wcs-screen" data-s="desktop"></div>
      </div></div>
      <div class="wcs-dev wcs-phone">
        <div class="wcs-screen" data-s="phone"></div>
      </div>
      <button type="button" class="wcs-arrow l" aria-label="Previous screen">${chev('M10 3 5 8l5 5')}</button>
      <button type="button" class="wcs-arrow r" aria-label="Next screen">${chev('M6 3l5 5-5 5')}</button>
    </div>`;
  host.appendChild(root);
  if (reduced) root.dataset.reduced = '';
  if (auto) root.dataset.auto = '';

  const $ = s => root.querySelector(s);
  const barsEl = $('.wcs-bars');
  const nameEl = $('.wcs-name');
  const countEl = $('.wcs-count');
  const segEl = $('.wcs-seg');
  const stage = $('.wcs-stage');
  const urlPath = $('.wcs-url u');
  const screens = { desktop: $('[data-s=desktop]'), phone: $('[data-s=phone]') };
  const bgs = [...root.querySelectorAll('.wcs-bg i')];
  let bgI = 0;
  let bgKey = '';
  const list = () => lists[dev];
  const pad = n => String(n).padStart(2, '0');

  // ---- layers: built lazily, one <figure> per screen (picture or video) -------------
  const cur = () => layers[dev][idx];
  const vmode = L => !!(L && L.video && !L.fallback && !reduced);
  const vdur = L => (Number.isFinite(L.video.duration) && L.video.duration > 0 ? L.video.duration : L.item.duration);

  function layer(d, i) {
    if (layers[d][i]) return layers[d][i];
    const s = lists[d][i];
    const fig = document.createElement('figure');
    fig.className = 'wcs-shot';
    const L = { fig, item: s, img: null, video: null, fallback: false, warmed: false, ready: null };
    let pix = null;
    if (s.type === 'video') {
      const v = document.createElement('video');
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.disablePictureInPicture = true;
      v.preload = 'none';
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-label', s.alt);
      const poster = s.posterWebp || s.poster;
      if (poster) {
        v.poster = poster;
        pix = L.img = new Image();   // preloaded so the crossfade never reveals a blank frame
        pix.src = poster;
      }
      if (s.webm) { const w = document.createElement('source'); w.type = 'video/webm'; w.src = s.webm; v.appendChild(w); }
      const m = document.createElement('source');
      m.type = 'video/mp4';
      m.src = s.src;
      v.appendChild(m);
      v.addEventListener('ended', () => { if (L === cur() && !dead && vmode(L)) { p = 1; paintFill(); go(idx + 1); } });
      const fail = () => { if (L === cur()) toFallback(L); else L.fallback = true; };
      v.addEventListener('error', fail);
      m.addEventListener('error', fail);   // last source: nothing left to try
      fig.appendChild(v);
      L.video = v;
    } else {
      const pic = document.createElement('picture');
      if (/\.avif$/.test(s.src)) {
        const src = document.createElement('source');
        src.type = 'image/avif';
        src.srcset = s.src;
        pic.appendChild(src);
      }
      const img = pix = L.img = new Image();
      img.src = s.webp || s.src;
      img.alt = s.alt;
      img.draggable = false;
      img.decoding = 'async';
      pic.appendChild(img);
      fig.appendChild(pic);
    }
    screens[d].appendChild(fig);
    L.ready = new Promise(res => {
      if (!pix) return res();
      pix.addEventListener('load', () => res(), { once: true });
      pix.addEventListener('error', () => res(), { once: true });
      later(res, 2500);
    });
    return (layers[d][i] = L);
  }

  // start fetching a video's bytes (preload="none" until it's the active slide or the next one)
  function warm(L) {
    if (!L?.video || L.warmed || reduced) return;
    L.warmed = true;
    L.video.preload = 'auto';
    L.video.load();
  }
  // autoplay refused, decode failed or stalled: poster + the normal interval
  function toFallback(L) {
    if (L.fallback) return;
    L.fallback = true;
    L.video.pause();
    if (L === cur()) { p = 0; paintFill(); sync(); }
  }
  function stopVideo(L, rewind) {
    if (!L?.video) return;
    L.video.pause();
    if (rewind && L.video.currentTime > 0) { try { L.video.currentTime = 0; } catch {} }
  }

  // ---- progress ---------------------------------------------------------------------
  function buildBars() {
    barsEl.textContent = '';
    list().forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wcs-bar';
      b.setAttribute('aria-label', `${s.label}, screen ${i + 1} of ${list().length}`);
      b.innerHTML = '<i><b></b></i>';
      b.addEventListener('click', e => { e.stopPropagation(); go(i); });
      b.addEventListener('pointerdown', e => e.stopPropagation());
      barsEl.appendChild(b);
    });
  }
  const fills = () => barsEl.querySelectorAll('b');
  function paintBars() {
    fills().forEach((b, i) => {
      b.style.transition = 'none';
      b.style.transform = `scaleX(${i < idx ? 1 : i === idx ? p : 0})`;
    });
    barsEl.querySelectorAll('.wcs-bar').forEach((b, i) => i === idx ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'));
  }
  function paintFill() {
    const b = fills()[idx];
    if (b) b.style.transform = `scaleX(${p})`;
  }

  const playing = () => !reduced && inView && !document.hidden && !hover && !press && !loading && !dead;
  function sync() {
    const L = cur();
    if (!playing()) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (L?.video) L.video.pause();
      return;
    }
    if (vmode(L)) {
      const v = L.video;
      warm(L);
      if (v.paused && !v.ended) {
        const pr = v.play();
        pr?.catch?.(err => { if (err?.name !== 'AbortError') toFallback(L); });
      }
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(t) {
    raf = 0;
    if (!playing()) return;
    const L = cur();
    if (vmode(L)) {
      // video slide: the bar follows the video clock, advancing is left to the 'ended' event
      const d = vdur(L);
      if (d) p = Math.min(1, L.video.currentTime / d);
      last = t;
      paintFill();
      raf = requestAnimationFrame(tick);
      return;
    }
    p += Math.min(t - last, 64) / interval;
    last = t;
    if (p >= 1) { go(idx + 1); return; }
    paintFill();
    raf = requestAnimationFrame(tick);
  }

  // ---- showing a screen -------------------------------------------------------------
  function label(first) {
    const s = list()[idx];
    nameEl.textContent = s.label;
    countEl.textContent = `${pad(idx + 1)} / ${pad(list().length)}`;
    urlPath.textContent = s.path;
    urlPath.classList.toggle('on', !!s.path);
    if (!first && !reduced && nameEl.animate) {
      nameEl.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
    }
  }

  // backdrop: crossfade between two tint layers, same timing as the image crossfade
  function paintTint(s) {
    const key = s.tint.join();
    if (key === bgKey) return;
    bgKey = key;
    const inc = bgs[bgI ^= 1];
    inc.style.setProperty('--t1', s.tint[0]);
    inc.style.setProperty('--t2', s.tint[1]);
    inc.classList.add('is-on');
    bgs[bgI ^ 1].classList.remove('is-on');
  }

  async function show(i, first) {
    const d = dev;
    const n = list().length;
    idx = ((i % n) + n) % n;
    p = 0;
    paintBars();
    label(first);
    const token = ++swapToken;
    const L = layer(d, idx);
    // only the active slide's video may run
    for (const k of DEVICES) layers[k].forEach(o => { if (o && o !== L) stopVideo(o, false); });
    if (L.video) { L.fallback = false; clearTimeout(L.wd); }
    // wait for the pixels so the crossfade never reveals a blank frame
    if (L.img && !L.img.complete) {
      loading = true;
      sync();
      await L.ready;
      loading = false;
    }
    if (dead || token !== swapToken || d !== dev) return;
    paintTint(list()[idx]);
    layers[d].forEach(o => {
      if (!o) return;
      if (o === L) { o.fig.classList.remove('is-prev'); o.fig.classList.add('is-on'); return; }
      if (o.fig.classList.contains('is-on')) {
        o.fig.classList.replace('is-on', 'is-prev');
        later(() => {
          if (o.fig.classList.contains('is-on')) return;
          o.fig.classList.remove('is-prev');
          stopVideo(o, true);   // rewound once it has faded out
        }, 1200);
      }
    });
    if (L.video) {
      if (L.video.currentTime > 0 || L.video.ended) { try { L.video.currentTime = 0; } catch {} }
      // watchdog: if it never starts moving, drop to poster + interval
      L.wd = setTimeout(() => {
        if (L === cur() && vmode(L) && !L.video.paused && L.video.currentTime < 0.05) toFallback(L);
      }, 4500);
      timers.add(L.wd);
    }
    // warm the next one just before it's needed
    later(() => {
      if (dead || d !== dev) return;
      const nx = layer(d, (idx + 1) % n);
      if (nx.video && nx !== L) warm(nx);
    }, first ? 900 : 120);
    sync();
  }

  function go(i) { show(i, false); }
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // ---- device switch ----------------------------------------------------------------
  function paintDevice() {
    stage.dataset.device = dev;
    segEl.style.setProperty('--i', DEVICES.indexOf(dev));
    segEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === dev)));
  }
  // enter a device set; the phone set waits (briefly) for its manifest the first time
  async function enter(d, first) {
    paintDevice();
    if (d === 'phone' && !phoneLoaded) {
      loading = true;
      sync();
      const items = await loadManifest(manifestUrl);
      loading = false;
      if (dead) return;
      if (!phoneLoaded) {
        phoneLoaded = true;
        if (items) { lists.phone = items; layers.phone.forEach(o => o?.fig.remove()); layers.phone = []; }
      }
      if (dev !== d) return;
    }
    buildBars();
    show(0, first);
  }
  function setDevice(d) {
    if (dead || !DEVICES.includes(d) || d === dev) return;
    dev = d;
    enter(d, false);
  }
  segEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-d]');
    if (b) setDevice(b.dataset.d);
  });

  // ---- input: tap halves, hold to pause, swipe --------------------------------------
  let down = null;
  stage.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now(), type: e.pointerType };
    press = true;
    sync();
  });
  const release = e => {
    if (!down) return;
    const d = down;
    down = null;
    press = false;
    if (e.type === 'pointercancel') { sync(); return; }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const held = performance.now() - d.t;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      dx < 0 ? next() : prev();
    } else if (Math.hypot(dx, dy) < 10 && !(d.type !== 'mouse' && held > 380)) {
      const r = stage.getBoundingClientRect();
      e.clientX < r.left + r.width / 2 ? prev() : next();
    } else sync();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  stage.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') hover = false;
    if (down && e.pointerType === 'mouse') { down = null; press = false; }
    sync();
  });
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });
  stage.addEventListener('dragstart', e => e.preventDefault());
  // arrow buttons sit on the stage; keep their presses away from the tap-halves handler
  root.querySelectorAll('.wcs-arrow').forEach(b => {
    const dir = b.classList.contains('l') ? prev : next;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('pointerup', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); dir(); });
  });

  // ---- visibility / reduced motion --------------------------------------------------
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.2 })
    : null;
  io?.observe(root);
  const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } sync(); };
  document.addEventListener('visibilitychange', onVis);
  const onMq = () => { reduced = mq.matches; root.toggleAttribute('data-reduced', reduced); sync(); };
  mq.addEventListener?.('change', onMq);

  // ---- go ---------------------------------------------------------------------------
  enter(dev, true);

  return {
    setDevice,
    destroy() {
      if (dead) return;
      dead = true;
      cancelAnimationFrame(raf);
      for (const k of DEVICES) layers[k].forEach(o => stopVideo(o, false));
      timers.forEach(clearTimeout);
      timers.clear();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mq.removeEventListener?.('change', onMq);
      root.remove();
    },
  };
}
