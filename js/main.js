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
// the hint is split into letters so the whole line can bob
const hintFl = document.querySelector('.hint .fl');
hintFl.innerHTML = [...hintFl.textContent.replace('click', touch ? 'tap' : 'click')].map((ch, i) => ch === ' ' ? ' ' : `<span style="--i:${i}">${ch}</span>`).join('');

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
      onMorph: (f, how) => feel.morph(how, f.x),
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
function plant(x, y, slop) {
  const p = garden.plant(x, y, slop);
  // a tap on a flower turns it into another of its kind; that's not a new planting, though the bee may come and look
  if (p?.morphed) {
    if (Math.random() < .3) setTimeout(() => bee.visit(p.flowers[0]), reduced ? 0 : 600);
    return;
  }
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
    // bare soil only: on a flower it would turn that one instead
    if (!avoid.some(([a, b, c, d]) => x > a && x < c && y > b && y < d + 50) && !garden.flowerAt?.(x, y)) return plant(x, y);
  }
  plant(w / 2, h * .55);
}
hint.addEventListener('click', plantSomewhere);

// ---- tapping the garden. a mouse acts the moment the button goes down; a finger dips the flower the moment it lands
// and acts as it lifts, so a swipe to scroll never plants anything. the bee and the butterflies perch right on the
// flowers, so a tap on one sitting on a flower startles it and turns the flower too, instead of needing a second tap
// once it's flown. a fingertip gets a little slop round each flower; a mouse is precise and barely needs any
const SLOP = { mouse: 4, touch: 14 };
const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
let down = null;
addEventListener('pointerdown', e => {
  if (about.isOpen || !e.isPrimary || e.button !== 0) return;
  const perched = e.target.closest?.('.bee, .bf');
  if (e.target !== canvas && !perched) return;
  const [x, y] = local(e), mouse = e.pointerType === 'mouse', slop = mouse ? SLOP.mouse : SLOP.touch;
  if (perched && !garden.flowerAt?.(x, y, slop)) return;
  garden.press?.(x, y, slop);
  if (!mouse) { down = { id: e.pointerId, x, y, sx: e.clientX, sy: e.clientY, slop }; return; }
  // fast clicks on the canvas shouldn't start selecting the page's text
  if (e.target === canvas) e.preventDefault();
  plant(x, y, slop);
  pointing(x, y, true);
}, true);
addEventListener('pointerup', e => {
  garden.release?.();
  if (e.pointerType === 'mouse' && e.target === canvas) pointing(...local(e));
  if (!down || e.pointerId !== down.id) return;
  const d = down; down = null;
  if (!about.isOpen && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 12) plant(d.x, d.y, d.slop);
}, true);
addEventListener('pointercancel', e => { if (down?.id === e.pointerId) { down = null; garden.release?.(); } }, true);

// the cursor, drawn like the garden: a little pixel hand over a flower (a click turns it), pressing in while the button's
// down, and a needle over bare soil (a click stitches one in). each gets a white edge so it reads over the flowers
function cursor(rows, ink, hx, hy) {
  const at = (x, y) => rows[y]?.[x] ?? '.', near = (x, y) => [-1, 0, 1].some(i => [-1, 0, 1].some(j => at(x + i, y + j) !== '.'));
  let px = '';
  for (let y = -1; y <= rows.length; y++) for (let x = -1; x <= rows[0].length; x++) {
    const col = at(x, y) !== '.' ? ink[at(x, y)] : near(x, y) ? '#fff' : null;
    if (col) px += `<rect x="${x + 1}" y="${y + 1}" width="1" height="1" fill="${col}"/>`;
  }
  const w = rows[0].length + 2, h = rows.length + 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${px}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx * 2 + 3} ${hy * 2 + 3}, pointer`;
}
const HAND = ['.....##.......', '....#oo#......', '....#oo#......', '....#oo#......', '....#oo###....', '....#oo#oo###.', '..###oo#oo#oo#',
  '.#oo#oooooooo#', '.#oooooooooo#.', '..#ooooooooo#.', '..#oooooooo#..', '...#ooooooo#..', '...#ooooooo#..', '....#######...'];
const NEEDLE = ['k............', '.ks..........', '..ks.........', '...ks........', '....ks.......', '.....ks......', '......ks.....',
  '.......kk....', '.......kpk...', '........kkp..', '...........p.', '...........p.', '..........p..'];
const INK = { '#': '#1f1d1b', o: '#fff', k: '#1f1d1b', s: '#c3c9d2', p: '#e8578f' };
// pressed, the hand sits a stitch lower than the click, so the fingertip reads as pushing in
const CURSORS = { flower: cursor(HAND, INK, 5, 0), press: cursor(['..............', ...HAND.slice(0, -1)], INK, 5, 0), soil: cursor(NEEDLE, INK, 0, 0) };
let shown = '';
function pointing(x, y, pressing = false) {
  const on = garden.hover?.(x, y) ?? false, c = on ? (pressing ? 'press' : 'flower') : 'soil';
  if (c !== shown) canvas.style.cursor = CURSORS[shown = c];
}
canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') pointing(...local(e), e.buttons === 1 && shown === 'press'); }, { passive: true });
canvas.addEventListener('pointerleave', () => { garden.hover?.(-1, -1); shown = ''; });

// ---- work: one scroll below; mounted when it gets close
const work = document.getElementById('work');
const toWork = () => work.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
// the about card's work link closes the card first, then scrolls. binding it here too would scroll under the open card
document.querySelectorAll('[data-work]').forEach(b => { if (!b.closest('.ab')) b.addEventListener('click', toWork); });
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

// dev only, never on the live site: the Agentation annotation toolbar, and the night mode prototype (?night=A…E) when
// its untracked folder is there. glob finds nothing for a missing file, so the build never breaks over it
if (import.meta.env.DEV) {
  const local = import.meta.glob(['./agentation-dev.js', './night-prototype/index.js']);
  for (const load of Object.values(local)) load().catch(err => console.warn('[dev]', err));
}
