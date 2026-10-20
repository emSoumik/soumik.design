// About me: the bee flies to the link, lands, and morphs into a small intro panel
// (Dynamic Island style). Closing folds the panel back into the bee, which flies off.
// createAbout({ bee }) -> { open(from), close() }
import { EMAIL, SOCIALS, WHYCLUB, FACTS } from '../content.js';
import { feel } from '../feel.js';

const AVATAR = new URL('../../assets/brand/avatar.webp', import.meta.url).href;
const MORPH = 'cubic-bezier(.32,.72,0,1)';
const OUT = 'cubic-bezier(.23,1,.32,1)';

const CSS = `
.ab { position: fixed; z-index: 70; width: min(440px, calc(100vw - 24px)); padding: 20px 22px 18px; border-radius: 28px; color: #1f1d1b;
  background: rgba(255,255,255,.96);
  box-shadow: 0 0 0 1px rgba(29,27,26,.08), inset 0 1px 0 rgba(255,255,255,.9), 0 24px 50px -20px rgba(20,20,30,.4), 0 6px 18px -10px rgba(20,20,30,.25);
  font: 400 14px/1.5 -apple-system, system-ui, sans-serif; }
/* frosted glass only where there's GPU to spare; on phones the veil already does the job */
@media (hover: hover) and (pointer: fine) { .ab { background: rgba(255,255,255,.86); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4); } }
.ab:focus { outline: none; }
/* while the card is open the bee sits on its corner, above the veil and the card */
.bee.front { z-index: 72; }
.bee.front .say { font-size: 13px; padding: 5px 10px; }
/* soft veil over the garden so the panel reads on its own, not on top of the wordmark */
.ab-veil { position: fixed; inset: 0; z-index: 69; background: rgba(255,255,255,.62); opacity: 0; pointer-events: none; transition: opacity .32s cubic-bezier(.23,1,.32,1); }
.ab-veil.on { opacity: 1; pointer-events: auto; }
/* the bee's skin, which fades as the panel takes shape */
.ab-skin { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(120% 140% at 50% 100%, #f6d777, #f3c64b 55%, #eab53a); }
.ab-in > * { opacity: 0; }
.ab-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.ab-top picture { display: contents; }
.ab-top img { width: 52px; height: 52px; object-fit: contain; mix-blend-mode: multiply; margin: -4px -2px -4px -6px; }
.ab-top h2 { font: 500 24px/1.1 "Instrument Sans", -apple-system, system-ui, sans-serif; letter-spacing: -.03em; color: rgba(31,29,27,.5); }
.ab-top h2 i { font-style: normal; color: #1f1d1b; }
.ab-x { all: unset; cursor: pointer; margin-left: auto; align-self: flex-start; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: rgba(29,27,26,.06); touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: background .2s, transform .16s ease-out; }
@media (hover: hover) and (pointer: fine) { .ab-x:hover { background: rgba(29,27,26,.12); } } .ab-x:active { transform: scale(.96); }
.ab-x::before { content: ""; position: absolute; inset: -8px; }
.ab-x { position: relative; z-index: 1; }
.ab-x:focus-visible { outline: 1.5px solid currentColor; outline-offset: 2px; }
.ab-x svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.ab p { color: rgba(31,29,27,.74); margin: 0 0 10px; text-wrap: pretty; } .ab p:last-of-type { margin-bottom: 10px; }
.ab p a { position: relative; color: #1f1d1b; text-decoration: underline; text-decoration-color: rgba(31,29,27,.25); text-underline-offset: 3px; text-decoration-thickness: 1px; touch-action: manipulation; transition: text-decoration-color .2s; border-radius: 3px; }
.ab p a:focus-visible { outline: 1.5px solid currentColor; outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) { .ab p a:hover { text-decoration-color: currentColor; } }
.ab dl { display: grid; grid-template-columns: 74px minmax(0, 1fr); align-items: center; column-gap: 12px; margin: 0; padding-top: 8px; border-top: 1px solid rgba(31,29,27,.1);
  font: 400 12px/1.3 ui-monospace, "SF Mono", Menlo, monospace; }
.ab dt { color: rgba(31,29,27,.5); } .ab dd { margin: 0; min-width: 0; min-height: 44px; display: flex; align-items: center; }
/* position has to follow all:unset. unset clears it, and then a stretched hit area anchors to the card. the last link, x, caught every click */
.ab dd a, .ab dd button { all: unset; box-sizing: border-box; cursor: pointer; position: relative; display: flex; align-items: center; flex: 1; min-width: 0; min-height: 44px;
  padding: 12px 2px; border-radius: 4px; overflow-wrap: anywhere; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  transform-origin: left center; transition: color .2s, transform .16s ease-out; }
.ab dd.ab-else { flex-wrap: wrap; }
.ab dd.ab-else a { flex: none; gap: 4px; justify-content: center; min-width: 44px; padding-inline: 10px; white-space: nowrap; }
.ab dd a:focus-visible, .ab dd button:focus-visible { outline: 1.5px solid currentColor; outline-offset: 2px; }
.ab dd a:active, .ab dd button:active { transform: scale(.96); }
.ab dd .sep { pointer-events: none; color: rgba(31,29,27,.3); padding: 0 2px; }
@media (hover: hover) and (pointer: fine) {
  .ab dd a:hover, .ab dd button:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
}
@media (max-width: 640px) { .ab { padding: 18px 18px 16px; } .ab-top h2 { font-size: 22px; } }
/* a landscape phone is shorter than the card. scroll inside it instead of losing the links off the bottom */
@media (max-height: 480px) {
  .ab { max-height: calc(100svh - 24px); overflow: auto; overscroll-behavior: contain; }
}
`;

export function createAbout({ bee } = {}) {
  if (!document.getElementById('ab-style')) document.head.insertAdjacentHTML('beforeend', `<style id="ab-style">${CSS}</style>`);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ext = s => s.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
  const el = document.createElement('div');
  el.className = 'ab';
  el.hidden = true;
  el.tabIndex = -1;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'ab-title');
  const newTab = '<span class="sr"> (opens in a new tab)</span>';
  el.innerHTML = `<div class="ab-skin" aria-hidden="true"></div>
    <div class="ab-in">
      <div class="ab-top"><picture><source srcset="${AVATAR.replace('.webp', '.avif')}" type="image/avif"><img src="${AVATAR}" alt=""></picture>
        <h2 id="ab-title">hi, i’m <i>soumik</i>.</h2>
        <button class="ab-x" type="button" aria-label="Close"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9"/></svg></button></div>
      <p>i design websites and apps, and then i write the code that builds them. usually that’s two different jobs done by two people, and the small details, like how a button feels when you tap it, get lost in between. i like doing both so they don’t.</p>
      <p>the biggest thing i’ve made is <a href="${WHYCLUB.href}" target="_blank" rel="noopener">whyclub${newTab}</a>, a streetwear brand i built on my own, from how it looks to the website to the system behind every order.</p>
      <dl>
        <dt>work</dt><dd><button type="button" data-work>see what i’ve made ↓</button></dd>
        <dt>say hi</dt><dd><a href="mailto:${EMAIL}">${EMAIL}</a></dd>
        <dt>elsewhere</dt><dd class="ab-else">${SOCIALS.filter(s => s.label !== 'Email').map(s => `<a href="${s.href}"${ext(s)}>${s.label} <span aria-hidden="true">↗</span>${newTab}</a>`).join('<span class="sep" aria-hidden="true">·</span>')}</dd>
      </dl>
    </div>`;
  const veil = document.createElement('div');
  veil.className = 'ab-veil';
  document.body.append(veil, el);
  const skin = el.querySelector('.ab-skin');
  const kids = [...el.querySelector('.ab-in').children];
  let isOpen = false, busy = false, opener = null, anim = [];

  const stop = () => { anim.forEach(a => a.cancel()); anim = []; };

  // Sits above its trigger, centred on it, kept inside the viewport.
  function place(from) {
    const r = from.getBoundingClientRect();
    const measure = el.hidden;
    el.hidden = false;
    if (measure) { el.style.visibility = 'hidden'; el.style.left = el.style.top = '0px'; }
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    const above = r.top - h - 16;
    const top = above > 12 ? above : Math.min(innerHeight - h - 12, r.bottom + 16);
    el.style.left = `${left}px`; el.style.top = `${top}px`;
    return { left, top, w, h, below: top > r.top };
  }

  // clip-path inset that crops the panel down to a rectangle in viewport px
  const crop = (p, r, round) => {
    const b = { left: Math.max(p.left, r.left), top: Math.max(p.top, r.top), right: Math.min(p.left + p.w, r.right), bottom: Math.min(p.top + p.h, r.bottom) };
    return `inset(${b.top - p.top}px ${p.left + p.w - b.right}px ${p.top + p.h - b.bottom}px ${b.left - p.left}px round ${round}px)`;
  };

  async function open(from) {
    if (isOpen || busy) return;
    busy = true; isOpen = true;
    opener = from || document.activeElement;
    // measure the panel first (still invisible), so the bee lands where the panel will grow from:
    // the edge nearest the link
    const p = place(opener);
    const r = opener.getBoundingClientRect();
    const lx = Math.max(p.left + 30, Math.min(p.left + p.w - 30, r.left + r.width / 2));
    const ly = p.below ? p.top + 22 : p.top + p.h - 12;
    // the tap answers at once: the veil comes up while the bee zips over. it gets a moment, not a wait;
    // if it's still on its way, the panel grows from where it was headed
    veil.classList.add('on');
    let landed = false;
    if (bee && !reduced) await Promise.race([bee.flyTo(lx + scrollX, ly + scrollY).then(() => { landed = true; }), new Promise(res => setTimeout(res, 380))]);
    el.style.visibility = '';
    stop();
    // the content is visible by default; the entrance only animates it from hidden, so nothing can leave it blank
    kids.forEach(k => k.style.opacity = 1);
    if (reduced || !bee) {
      anim = [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: OUT })];
    } else {
      const b = landed ? bee.rect() : { left: lx - 13, top: ly - 13, right: lx + 13, bottom: ly + 13 };
      bee.el.style.opacity = 0;
      const from = crop(p, b, 13);
      const to = `inset(0px 0px 0px 0px round 28px)`;
      anim.push(el.animate([{ clipPath: from }, { clipPath: to }], { duration: 420, easing: MORPH }));
      anim.push(skin.animate([{ opacity: 1 }, { opacity: .9, offset: .12 }, { opacity: 0 }], { duration: 260, easing: OUT }));
      // the words ride in with the morph rather than after it
      kids.forEach((k, i) => anim.push(k.animate(
        [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, delay: 70 + i * 30, easing: OUT, fill: 'backwards' })));
    }
    el.focus({ preventScroll: true });
    busy = false;
    if (bee) setTimeout(() => { if (isOpen && !busy) perch(); }, reduced ? 0 : 380);
  }

  // ---- the bee pops back out, sits on the card's top corner and tells you things about him -----
  let factT = 0, factI = 0;
  function perch(tell = true) {
    const c = el.getBoundingClientRect();
    bee.el.style.opacity = '';
    bee.el.classList.add('front');
    bee.flyTo(c.right - 34 + scrollX, c.top + 1 + scrollY).then(() => { if (isOpen && tell) fact(); });
  }
  function fact() {
    clearTimeout(factT);
    if (!isOpen || factI >= FACTS.length) return;
    const line = FACTS[factI++];
    bee.talk(line, 3000);
    // read time, then the next one; tapping the bee skips ahead
    factT = setTimeout(fact, 3400);
  }
  bee?.el.addEventListener('click', () => { if (isOpen && !busy) { jig(); feel.sparkle(bee.rect().left); fact(); } });
  const jig = () => { bee.el.classList.remove('hit'); requestAnimationFrame(() => bee.el.classList.add('hit')); };

  async function close(next) {
    if (!isOpen || busy) return;
    busy = true;
    clearTimeout(factT); factI = 0;
    const p = { left: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    veil.classList.remove('on');
    stop();
    if (reduced || !bee) {
      await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: OUT }).finished;
    } else {
      const b = bee.rect();
      const fold = [
        el.animate([{ clipPath: 'inset(0px 0px 0px 0px round 28px)' }, { clipPath: crop(p, b, 13) }], { duration: 280, easing: MORPH, fill: 'forwards' }),
        skin.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: OUT, fill: 'forwards' }),
        ...kids.map(k => k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: OUT, fill: 'forwards' })),
      ];
      await fold[0].finished;
      bee.el.style.opacity = '';
      fold.forEach(a => a.cancel());
    }
    el.hidden = true;
    kids.forEach(k => k.style.opacity = '');
    bee?.el.classList.remove('front');
    bee?.release(next === 'work' ? 'this way!' : 'bye!');
    isOpen = false; busy = false;
    if (next !== 'work') opener?.focus?.({ preventScroll: true });
  }

  el.querySelector('.ab-x').addEventListener('click', () => close());
  el.querySelector('[data-work]').addEventListener('click', async () => {
    await close('work');
    document.getElementById('work')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  // keep tab inside the card. the bee sits outside it on purpose, so it stays a pointer-only extra
  el.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !isOpen) return;
    const items = [...el.querySelectorAll('a[href], button:not([disabled])')];
    if (!items.length) return;
    const first = items[0], last = items.at(-1), here = document.activeElement;
    if (e.shiftKey && (here === first || here === el)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && here === last) { e.preventDefault(); first.focus(); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) close(); });
  addEventListener('pointerdown', e => { if (isOpen && !busy && !el.contains(e.target) && !opener?.contains(e.target) && !bee?.el.contains(e.target)) close(); }, true);
  addEventListener('resize', () => {
    if (!isOpen || busy || !opener) return;
    place(opener);
    if (bee?.el.classList.contains('front')) perch(false);
  });
  addEventListener('scroll', () => { if (isOpen && !busy && scrollY > innerHeight * .4) close(); }, { passive: true });

  return { open, close, get isOpen() { return isOpen; } };
}
