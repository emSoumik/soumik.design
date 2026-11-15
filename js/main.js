// soumik.design: wires the page together. the garden, the bee and butterflies, the about card, the work below.
import { SOCIALS, css } from './content.js';
import { createBee, BEE_CSS } from './garden/bee.js';
import { createButterflies, BUTTERFLY_CSS } from './garden/butterflies.js';
import { createGarden as pixelGarden } from './garden/pixels.js';
import { createCursor } from './garden/cursor.js';
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

const ext = s => s.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
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
// data saver, slow-2g or 2g: no work section on idle, only when it nears the screen (work.js handles its own videos). no api, not lean
const conn = navigator.connection;
const lean = !!conn && (conn.saveData || /^(slow-2g|2g)$/.test(conn.effectiveType));
// dev only: ?slow=3000 waits that long before building the garden, to see the waiting sprout and the tap replay
if (import.meta.env.DEV) { const ms = +new URLSearchParams(location.search).get('slow'); if (ms > 0) await new Promise(r => setTimeout(r, ms)); }
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
        n: mob ? 4 : 12,
      }),
      onStitch: (f, part, p) => feel.stitch({ id: f.id, kind: f.kind, part, p, x: f.x }),
      onBloom: f => feel.plant(1, f.x, { id: f.id, kind: f.kind }),
      onMorph: (f, how) => feel.morph(how, f.x, { kind: f.kind }),
      onSparkle: (ms, x) => setTimeout(() => feel.sparkle(x), ms),
      onGrown: () => grown(),
    });
  }
} catch (e) { console.warn('garden unavailable', e); }

// the garden is built (or failed): the waiting sprout opens and the hint takes over. only a load slow enough for the sprout to
// have shown (.waited) gets the handover; a fast one just gets the hint, on its old timing
const waited = performance.now() > 1250;
document.documentElement.classList.toggle('waited', waited);
document.getElementById('hint').style.setProperty('--d', waited ? '1.1s' : `${Math.max(0, 1600 - performance.now()) | 0}ms`);
document.documentElement.classList.add('ready');

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
const root = document.documentElement;

// ---- the dock tucks into its yellow bud while you garden; a tap on the bud opens it again. its layout never changes:
// the pill clips shut round the avatar and carries it to the middle (index.astro), from offsets measured whenever its size does
const nav = document.querySelector('.nav'), navMe = nav.querySelector('.me'), navMore = nav.querySelector('.more');
new ResizeObserver(() => {
  const n = nav.getBoundingClientRect(), m = navMe.getBoundingClientRect(), d = m.height, s = nav.style;
  s.setProperty('--dk-t', `${m.top - n.top}px`); s.setProperty('--dk-b', `${n.bottom - m.bottom}px`);
  s.setProperty('--dk-l', `${m.left - n.left}px`); s.setProperty('--dk-r', `${n.right - m.left - d}px`);
  s.setProperty('--dk-dx', `${n.left + n.width / 2 - (m.left + d / 2)}px`);
}).observe(nav);
// tucked after you've scrolled away, the next scroll opens it again (as crossing the top line does)
const untuckOnScroll = () => tuck(false);
function tuck(on) {
  root.classList.toggle('tuck', on);
  navMore.inert = on;
  if (on) {
    root.classList.remove('open');
    if (root.classList.contains('moved')) addEventListener('scroll', untuckOnScroll, { once: true, passive: true });
  } else removeEventListener('scroll', untuckOnScroll);
}

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
  tuck(true);
  cursor.tapped(p);
  // a tap on a flower turns it into another of its kind; that's not a new planting, though the bee may come and look
  if (p?.morphed) {
    if (Math.random() < .3) setTimeout(() => bee.visit(p.flowers[0]), reduced ? 0 : 600);
    return;
  }
  const gardenVariant = ink ? 'watercolour' : 'pixel';
  window.posthog?.capture('garden_flower_planted', { garden_variant: gardenVariant });
  window.posthogLog?.info('garden flower planted', { garden_variant: gardenVariant });
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
}, true);
addEventListener('pointerup', e => {
  garden.release?.();
  if (!down || e.pointerId !== down.id) return;
  const d = down; down = null;
  if (!about.isOpen && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 12) plant(d.x, d.y, d.slop);
}, true);
addEventListener('pointercancel', e => { if (down?.id === e.pointerId) { down = null; garden.release?.(); } }, true);

// the cursor: a pastel pixel arrow drawn by hand over the garden, for a mouse only (see garden/cursor.js). it also asks the
// garden which flower is under the pointer, so that flower leans towards it
const cursor = touch ? { tapped() {} } : createCursor({ canvas, hover: (x, y) => garden.hover?.(x, y), peek: (x, y, id) => garden.peek?.(x, y, id) });
canvas.addEventListener('pointerleave', () => garden.hover?.(-1, -1));

// taps made while the garden was still loading (recorded by the inline script in index.astro) get planted now, one after another
const early = (window.__early || []).splice(0);
if (early.length) {
  early.forEach(([x, y, type], i) => setTimeout(() => plant(x, y, type === 'mouse' ? SLOP.mouse : SLOP.touch), reduced ? 0 : (waited ? 700 : 0) + i * 140));
  setTimeout(() => sayHint('kept your taps. here they are.'), reduced ? 0 : (waited ? 700 : 0) + early.length * 140 + 500);
}

// ---- projects: one scroll below; mounted when it gets close
const work = document.getElementById('projects');
const toWork = () => work.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
// the about card's work link closes the card first, then scrolls. binding it here too would scroll under the open card
document.querySelectorAll('[data-work]').forEach(b => { if (!b.closest('.ab')) b.addEventListener('click', toWork); });
// the dock arrives quiet and fills in once you leave the top (which also untucks it): a line 24px down the hero says when,
// so a scroll never reads or writes anything. projects gets its dot while the list is on screen
new IntersectionObserver(es => { const m = !es[es.length - 1].isIntersecting; root.classList.toggle('moved', m); if (m) tuck(false); })
  .observe(document.querySelector('.moved-at'));
// the hint's breeze stops while the hero is out of sight
const hero = document.querySelector('.hero');
new IntersectionObserver(es => hero.classList.toggle('off', !es[es.length - 1].isIntersecting)).observe(hero);
if ('IntersectionObserver' in window) new IntersectionObserver(es => root.classList.toggle('at-work', es[es.length - 1].isIntersecting), { rootMargin: '-40% 0px -40% 0px' }).observe(work);
let mounted = false;
const mountWork = async () => {
  if (mounted) return; mounted = true;
  // skullet's element comes along to draw the waiting section, but the work never waits for it: whichever lands
  // second simply finds the other done (work.js falls back to plain markup if skullet isn't up yet)
  import('skullet/element').catch(() => {});
  try {
    (await import('./work/work.js')).mountWork(work);
    // mochi rides along: one line per project, then one at the end
    mochi.watch(document.querySelector('#work-whyclub .wk-head'), 'he built all of it. front to back.');
    mochi.watch(document.querySelector('#work-vayu .wk-head'), 'a watch that warns you about bad air.');
    mochi.watch(document.querySelector('#work-fontpreview .wk-head'), 'press space on a font. that’s it.');
    mochi.watch(document.querySelector('.wk-end'), 'say hi. he reads every email.', { threshold: .6 });
  } catch (e) { console.warn('work unavailable', e); work.querySelector('skullet-reveal')?.remove(); }
};
// nothing below the fold is fetched up front: the work mounts when you head towards it, or once the garden
// has grown and the phone has a quiet moment. its videos and webgl wait until they're nearly on screen
new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); mountWork(); } }, { rootMargin: '0px' }).observe(work);
const whenIdle = f => 'requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 3000 }) : setTimeout(f, 600);
// data saver or 2g: don't spend their data on it until they scroll that way
if (!lean) addEventListener('load', () => setTimeout(() => whenIdle(mountWork), 5200), { once: true });

// ---- about: the bee flies over and becomes the panel; mochi steps aside
// (the dock's about is the bud while it's tucked: then a tap opens the dock, not the card)
document.querySelectorAll('[data-about]').forEach(b => b.addEventListener('click', e => {
  e.preventDefault();
  if (b.closest('.nav') && root.classList.contains('tuck')) { tuck(false); root.classList.add('open'); return; }
  if (about.isOpen) about.close(); else { mochi.hush(); about.open(b); }
}));

// ---- mochi wakes up, then nudges once, unless they're already looking at the work
setTimeout(() => mochi.arrive(), reduced ? 0 : 2600);
setTimeout(() => {
  if (scrollY > innerHeight * .3 || about.isOpen) return;
  mochi.say('psst. want to see what soumik made?', { action: toWork });
}, 4400);
// /#projects: mount first so the section has its height, then land on it (the browser's own jump fires before that)
if (location.hash === '#projects') mountWork().then(() => requestAnimationFrame(() => work.scrollIntoView({ behavior: 'auto' })));
if (location.hash === '#about') setTimeout(() => about.open(document.querySelector('.nav [data-about]')), 1200);

// dev only, never on the live site: the Agentation annotation toolbar, and the night garden prototype when
// its untracked folder is there. glob finds nothing for a missing file, so the build never breaks over it
if (import.meta.env.DEV) {
  const local = import.meta.glob(['./agentation-dev.js', './night-prototype/index.js']);
  for (const load of Object.values(local)) load().catch(err => console.warn('[dev]', err));
}
