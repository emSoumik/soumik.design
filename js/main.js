// soumik.design: wires the page together. the garden, the bee and butterflies, the about card, the work below.
import { SOCIALS, css } from './content.js';
import { createBee, BEE_CSS } from './garden/bee.js';
import { createButterflies, BUTTERFLY_CSS } from './garden/butterflies.js';
import { createGarden as pixelGarden } from './garden/pixels.js';
import { createAbout } from './companions/about.js';
import { feel } from './feel.js';

// mochi, the cat in the corner, is switched off for now. flip this to bring her back; her code is in companions/mochi.js
const MOCHI = false;

css(BEE_CSS + BUTTERFLY_CSS);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
if (touch) document.querySelectorAll('.v').forEach(v => v.textContent = 'tap');

const ICON = {
  LinkedIn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.6h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.5 4.77 5.76v5.59h-4v-4.96c0-1.18-.02-2.7-1.7-2.7-1.7 0-1.95 1.28-1.95 2.61v5.05h-4v-11Z"/></svg>',
  X: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.32l4.37 5.78L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z"/></svg>',
  Email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
};
const ext = s => s.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
document.getElementById('icons').innerHTML = SOCIALS.map(s => `<a href="${s.href}"${ext(s)} aria-label="${s.label}">${ICON[s.label]}</a>`).join('');
document.getElementById('socials').innerHTML = SOCIALS.map(s => `<a href="${s.href}"${ext(s)}>${s.label === 'X' ? 'x.com' : s.label.toLowerCase()}</a>`).join('');

setTimeout(() => document.querySelector('.mark h1').classList.remove('load'), 3400);

// ---- sound: on by default, remembered; every press clicks softly
const snd = document.getElementById('snd');
const paintSnd = () => { snd.setAttribute('aria-pressed', String(!feel.muted)); snd.setAttribute('aria-label', feel.muted ? 'Sound off' : 'Sound on'); };
paintSnd(); feel.onMute(paintSnd);
snd.addEventListener('click', () => { feel.muted = !feel.muted; if (!feel.muted) feel.hello(); });
document.addEventListener('click', e => { if (e.target.closest('a, button') && !e.target.closest('.mo, #snd, #clear')) feel.tap(); }, true);

// ---- garden + bee. pixel flowers by default; ?garden=ink brings back the watercolour
const canvas = document.getElementById('garden');
const ink = new URLSearchParams(location.search).get('garden') === 'ink';
let garden = { plant() {}, patches: () => [] };
const rectsOf = (sel, pad = 0) => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect();
  return [r.left - c.left - pad, r.top - c.top - pad, r.right - c.left + pad, r.bottom - c.top + pad]; });
const KEEP = '.mark, .cw, .top, .nav, .hint';
try {
  if (ink) {
    const { createGarden } = await import('./garden/watercolour.js');
    garden = createGarden(canvas, { initial: 'auto',
      bed: (w, h, mob) => mob ? { cx: w / 2, cy: h * .52, bw: Math.min(250, w - 120), bh: 160 } : { cx: w / 2, cy: h * .6, bw: Math.min(620, w - 80), bh: 150 } });
  } else {
    garden = pixelGarden(canvas, {
      initial: 'auto',
      // scattered around the name like a sampler, kept off the type and the links
      field: (w, h, mob) => ({
        rect: mob ? [20, h * .12, w - 20, h * .66] : [40, h * .1, w - 40, h * .72],
        avoid: rectsOf(KEEP, mob ? 8 : 16),
        n: mob ? 7 : 12,
      }),
      onStitch: () => feel.stitch(),
      onBloom: f => feel.plant(1, f.x),
      onSparkle: (ms, x) => setTimeout(() => feel.sparkle(x), ms),
      onGrown: () => grown(),
    });
  }
} catch (e) { console.warn('garden unavailable', e); }

const spots = () => garden.patches().flatMap(p => p.flowers);
const bee = createBee({ spots, start: 2.4 });
// butterflies keep off wherever the bee is sitting (read only when one picks a flower)
// up to five on a desktop; a phone has room for two, with the bee already doing the rounds
const FLY_MAX = innerWidth <= 640 ? 2 : 5;
const flies = createButterflies({ host: document.querySelector('.hero'), spots, count: FLY_MAX,
  busy: () => { const r = bee.rect(); return [{ x: r.left + r.width / 2 + scrollX, y: r.top + r.height * .82 + scrollY }]; } });
const about = createAbout({ bee });
// while she's off, everything that talks to her talks to a quiet stand-in
const mochi = MOCHI ? (await import('./companions/mochi.js')).createMochi() : { say() {}, watch() {}, hush() {}, arrive() {}, mood() {} };

const hint = document.getElementById('hint'), swap = hint.querySelector('.swap');
const AFTER = ['your first. it suits you.', 'the bee wants a word with you.', 'three. now it’s a garden.', 'the bee is fully booked.', 'the butterflies heard about this.', 'ok, this is a meadow now.'];
let planted = 0, sinceClear = 0, hintT, keep = null;
function nudgeHint() {
  if (planted > AFTER.length + 2) return;
  sayHint(AFTER[Math.min(planted - 1, AFTER.length - 1)]);
}
function sayHint(text) {
  swap.classList.add('out');
  clearTimeout(hintT);
  hintT = setTimeout(() => {
    keep = keep || swap.innerHTML;
    swap.textContent = text; swap.classList.remove('out');
    hintT = setTimeout(() => { swap.classList.add('out'); hintT = setTimeout(() => { swap.innerHTML = keep; keep = null; swap.classList.remove('out'); }, 300); }, 2600);
  }, 300);
}
const any = a => a[Math.floor(Math.random() * a.length)];

// ---- butterflies: one turns up once the garden has grown, more join as it fills in
let inviteT;
const want = () => garden.patches().length < 3 ? 0 : Math.min(FLY_MAX, 1 + Math.floor(garden.patches().length / 5));
function invite(ms) { clearTimeout(inviteT); inviteT = setTimeout(() => { if (flies.count < want()) flies.add(); }, reduced ? 0 : ms); }
function grown() { showClear(); invite(1500); }

// ---- clear: everything unstitches, the butterflies scatter, fresh soil
const clearBtn = document.getElementById('clear');
let clearing = false;
function showClear(on = true) {
  if (!garden.clear) return;
  clearBtn.classList.toggle('on', on);
  clearBtn.tabIndex = on ? 0 : -1;
}
clearBtn.addEventListener('click', async () => {
  if (clearing) return;
  clearing = true;
  clearBtn.classList.remove('dig'); void clearBtn.offsetWidth; clearBtn.classList.add('dig');
  clearTimeout(inviteT);
  flies.scatter();
  feel.clear();
  bee.talk(any(['all gone!', 'oh! fresh soil', 'bzz… where’d they go?', 'again? yes!']), 1800);
  await garden.clear();
  sinceClear = 0;
  showClear(false);
  // keep the focus somewhere sensible for keyboard folks
  if (document.activeElement === clearBtn) hint.focus({ preventScroll: true });
  sayHint('fresh soil. plant again.');
  clearing = false;
});
function plant(x, y) {
  const p = garden.plant(x, y);
  if (ink) feel.plant(1);
  planted++; sinceClear++;
  nudgeHint();
  showClear();
  const fl = p?.flowers?.length ? p.flowers[Math.floor(Math.random() * p.flowers.length)] : null;
  // usually the bee rushes over; now and then a butterfly gets there first and the bee lets it
  if (fl && flies.count && Math.random() < .3) {
    setTimeout(() => flies.visit(fl), reduced ? 0 : 900);
    setTimeout(() => bee.talk(any(['after you', 'ooh, a butterfly', 'fine, that one’s yours'])), reduced ? 0 : 1300);
  } else if (fl) setTimeout(() => bee.visit(fl), reduced ? 0 : 700);
  invite(2600);
}
// somewhere open in the field, for the keyboard and the hint
function plantSomewhere() {
  const w = canvas.clientWidth, h = canvas.clientHeight, m = w <= 640;
  const avoid = rectsOf(KEEP, 20);
  for (let i = 0; i < 40; i++) {
    const x = 30 + Math.random() * (w - 60), y = h * (m ? .14 : .12) + Math.random() * h * (m ? .5 : .58);
    if (!avoid.some(([a, b, c, d]) => x > a && x < c && y > b && y < d + 50)) return plant(x, y);
  }
  plant(w / 2, h * .55);
}
canvas.addEventListener('click', e => { if (!about.isOpen) plant(e.offsetX, e.offsetY); });
hint.addEventListener('click', plantSomewhere);

// ---- work: one scroll below; mounted when it gets close
const work = document.getElementById('work');
const toWork = () => work.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
document.querySelectorAll('[data-work]').forEach(b => b.addEventListener('click', toWork));
let mounted = false;
const mountWork = async () => {
  if (mounted) return; mounted = true;
  try {
    (await import('./work/work.js')).mountWork(work);
    // mochi rides along: one line per project, then one at the end
    mochi.watch(document.querySelector('#work-whyclub .wk-head'), 'he built all of it. front to back.');
    mochi.watch(document.querySelector('#work-shaders .wk-head'), () => touch ? 'tap through them. they’re live webgl.' : 'click through them. they’re live webgl.');
    mochi.watch(document.querySelector('.wk-end'), 'say hi. he reads every email.', { threshold: .6 });
  } catch (e) { console.warn('work unavailable', e); }
};
// nothing below the fold is fetched up front: the work mounts when you head towards it, or once the garden
// has grown and the phone has a quiet moment. its videos and webgl wait until they're nearly on screen
new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); mountWork(); } }, { rootMargin: '0px' }).observe(work);
const whenIdle = f => 'requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 3000 }) : setTimeout(f, 600);
addEventListener('load', () => setTimeout(() => whenIdle(mountWork), 5200), { once: true });

// ---- about: the bee flies over and becomes the panel; mochi steps aside
document.querySelectorAll('[data-about]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); if (about.isOpen) about.close(); else { mochi.hush(); about.open(b); } }));

// ---- mochi wakes up, then nudges once, unless they're already looking at the work
setTimeout(() => mochi.arrive(), reduced ? 0 : 2600);
setTimeout(() => {
  if (scrollY > innerHeight * .3 || about.isOpen) return;
  mochi.say('psst. want to see what soumik made?', { action: toWork });
}, 4400);
if (location.hash === '#about') setTimeout(() => about.open(document.querySelector('.nav [data-about]')), 1200);
